const { client } = require('../../config/elasticsearch');
const { productIndexMapping } = require('./mapping');
const { searchQueryIndexMapping } = require('./searchQueryMapping');
const logger = require('../../utils/logger');

const INDEX_PREFIX = process.env.ELASTICSEARCH_INDEX_PREFIX || 'ecommerce_';
const PRODUCTS_INDEX = `${INDEX_PREFIX}products`;
const SEARCH_QUERIES_INDEX = `${INDEX_PREFIX}search_queries`;

class ElasticsearchService {

  /**
   * Initialize indices
   */
  async initializeIndices() {
    try {
      // Create products index
      const productsExists = await client.indices.exists({ index: PRODUCTS_INDEX });
      if (!productsExists) {
        await client.indices.create({
          index: PRODUCTS_INDEX,
          body: productIndexMapping
        });
        logger.info(`Created index: ${PRODUCTS_INDEX}`);
      }

      // Create search queries index
      const queriesExists = await client.indices.exists({ index: SEARCH_QUERIES_INDEX });
      if (!queriesExists) {
        await client.indices.create({
          index: SEARCH_QUERIES_INDEX,
          body: searchQueryIndexMapping
        });
        logger.info(`Created index: ${SEARCH_QUERIES_INDEX}`);
      }

      return true;
    } catch (error) {
      logger.error('Initialize indices error:', error);
      throw error;
    }
  }

  /**
   * Index a product
   */
  async indexProduct(product) {
    try {
      const document = this.prepareProductDocument(product);
      
      await client.index({
        index: PRODUCTS_INDEX,
        id: product.id,
        body: document,
        refresh: true
      });

      logger.info(`Product indexed: ${product.id}`);
      return true;
    } catch (error) {
      logger.error('Index product error:', error);
      throw error;
    }
  }

  /**
   * Bulk index products
   */
  async bulkIndexProducts(products) {
    try {
      const operations = products.flatMap(product => [
        { index: { _index: PRODUCTS_INDEX, _id: product.id } },
        this.prepareProductDocument(product)
      ]);

      const response = await client.bulk({
        body: operations,
        refresh: true
      });

      if (response.errors) {
        logger.error('Bulk indexing had errors');
      } else {
        logger.info(`Bulk indexed ${products.length} products`);
      }

      return response;
    } catch (error) {
      logger.error('Bulk index error:', error);
      throw error;
    }
  }

  /**
   * Update product in index
   */
  async updateProduct(productId, updates) {
    try {
      await client.update({
        index: PRODUCTS_INDEX,
        id: productId,
        body: {
          doc: updates
        },
        refresh: true
      });

      logger.info(`Product updated in index: ${productId}`);
      return true;
    } catch (error) {
      logger.error('Update product error:', error);
      throw error;
    }
  }

  /**
   * Delete product from index
   */
  async deleteProduct(productId) {
    try {
      await client.delete({
        index: PRODUCTS_INDEX,
        id: productId,
        refresh: true
      });

      logger.info(`Product deleted from index: ${productId}`);
      return true;
    } catch (error) {
      if (error.meta?.statusCode === 404) {
        logger.warn(`Product not found in index: ${productId}`);
        return true;
      }
      logger.error('Delete product error:', error);
      throw error;
    }
  }

  /**
   * Full-text search
   */
  async search(query, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        categoryId,
        minPrice,
        maxPrice,
        brands,
        tags,
        inStock = true,
        sortBy = 'relevance',
        filters = {}
      } = options;

      const from = (page - 1) * limit;
      
      const searchBody = this.buildSearchQuery(query, {
        categoryId,
        minPrice,
        maxPrice,
        brands,
        tags,
        inStock,
        filters
      });

      // Add sorting
      searchBody.sort = this.buildSortOptions(sortBy);

      const response = await client.search({
        index: PRODUCTS_INDEX,
        body: searchBody,
        from,
        size: limit
      });

      const results = {
        total: response.hits.total.value,
        products: response.hits.hits.map(hit => ({
          ...hit._source,
          score: hit._score
        })),
        aggregations: response.aggregations,
        page,
        limit,
        totalPages: Math.ceil(response.hits.total.value / limit)
      };

      // Log search query
      await this.logSearchQuery(query, response.hits.total.value, options.userId);

      return results;
    } catch (error) {
      logger.error('Search error:', error);
      throw error;
    }
  }

  /**
   * Build search query
   */
  buildSearchQuery(query, filters) {
    const must = [];
    const filter = [];

    // Main search query
    if (query && query.trim()) {
      must.push({
        multi_match: {
          query: query,
          fields: [
            'name^3',              // Boost name matches
            'name.autocomplete^2',
            'description',
            'brand^2',
            'category.name',
            'tags'
          ],
          type: 'best_fields',
          fuzziness: process.env.ENABLE_FUZZY_SEARCH === 'true' ? 'AUTO' : 0,
          prefix_length: 2
        }
      });
    } else {
      must.push({ match_all: {} });
    }

    // Filter: Active products only
    filter.push({ term: { isActive: true } });

    // Filter: In stock
    if (filters.inStock) {
      filter.push({ range: { stockQuantity: { gt: 0 } } });
    }

    // Filter: Category
    if (filters.categoryId) {
      filter.push({ term: { 'category.id': filters.categoryId } });
    }

    // Filter: Price range
    if (filters.minPrice || filters.maxPrice) {
      const priceRange = {};
      if (filters.minPrice) priceRange.gte = filters.minPrice;
      if (filters.maxPrice) priceRange.lte = filters.maxPrice;
      filter.push({ range: { price: priceRange } });
    }

    // Filter: Brands
    if (filters.brands && filters.brands.length > 0) {
      filter.push({ terms: { 'brand.keyword': filters.brands } });
    }

    // Filter: Tags
    if (filters.tags && filters.tags.length > 0) {
      filter.push({ terms: { tags: filters.tags } });
    }

    // Aggregations for faceted search
    const aggregations = {
      categories: {
        terms: { field: 'category.name.keyword', size: 20 }
      },
      brands: {
        terms: { field: 'brand.keyword', size: 20 }
      },
      price_ranges: {
        range: {
          field: 'price',
          ranges: [
            { to: 500 },
            { from: 500, to: 1000 },
            { from: 1000, to: 2000 },
            { from: 2000, to: 5000 },
            { from: 5000 }
          ]
        }
      },
      avg_price: {
        avg: { field: 'price' }
      },
      max_price: {
        max: { field: 'price' }
      },
      min_price: {
        min: { field: 'price' }
      }
    };

    return {
      query: {
        bool: {
          must,
          filter
        }
      },
      aggregations
    };
  }

  /**
   * Build sort options
   */
  buildSortOptions(sortBy) {
    const sortOptions = {
      relevance: [{ _score: 'desc' }],
      price_asc: [{ price: 'asc' }],
      price_desc: [{ price: 'desc' }],
      newest: [{ createdAt: 'desc' }],
      popular: [{ soldCount: 'desc' }, { views: 'desc' }],
      rating: [{ averageRating: 'desc' }, { reviewCount: 'desc' }]
    };

    return sortOptions[sortBy] || sortOptions.relevance;
  }

  /**
   * Autocomplete suggestions
   */
  async getSuggestions(query, limit = 5) {
    try {
      const response = await client.search({
        index: PRODUCTS_INDEX,
        body: {
          suggest: {
            product_suggest: {
              prefix: query,
              completion: {
                field: 'name.suggest',
                size: limit,
                skip_duplicates: true,
                fuzzy: {
                  fuzziness: 'AUTO'
                }
              }
            }
          }
        }
      });

      const suggestions = response.suggest.product_suggest[0].options.map(
        option => option.text
      );

      return suggestions;
    } catch (error) {
      logger.error('Get suggestions error:', error);
      return [];
    }
  }

  /**
   * Search as you type
   */
  async searchAsYouType(query, limit = 10) {
    try {
      const response = await client.search({
        index: PRODUCTS_INDEX,
        body: {
          query: {
            bool: {
              must: [
                {
                  multi_match: {
                    query: query,
                    fields: ['name.autocomplete'],
                    type: 'bool_prefix'
                  }
                }
              ],
              filter: [
                { term: { isActive: true } }
              ]
            }
          },
          _source: ['id', 'name', 'price', 'images', 'category'],
          size: limit
        }
      });

      return response.hits.hits.map(hit => hit._source);
    } catch (error) {
      logger.error('Search as you type error:', error);
      return [];
    }
  }

  /**
   * Get trending searches
   */
  async getTrendingSearches(limit = 10) {
    try {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const response = await client.search({
        index: SEARCH_QUERIES_INDEX,
        body: {
          query: {
            range: {
              timestamp: {
                gte: oneDayAgo.toISOString()
              }
            }
          },
          aggs: {
            trending_queries: {
              terms: {
                field: 'query.keyword',
                size: limit,
                order: { _count: 'desc' }
              }
            }
          },
          size: 0
        }
      });

      return response.aggregations.trending_queries.buckets.map(
        bucket => ({
          query: bucket.key,
          count: bucket.doc_count
        })
      );
    } catch (error) {
      logger.error('Get trending searches error:', error);
      return [];
    }
  }

  /**
   * Log search query
   */
  async logSearchQuery(query, resultCount, userId = null) {
    try {
      await client.index({
        index: SEARCH_QUERIES_INDEX,
        body: {
          query: query.trim(),
          userId,
          resultCount,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Log search query error:', error);
    }
  }

  /**
   * Prepare product document for indexing
   */
  prepareProductDocument(product) {
    return {
      id: product.id,
      name: product.name,
      description: product.description || '',
      sku: product.sku || '',
      price: parseFloat(product.price),
      discountPrice: product.discountPrice ? parseFloat(product.discountPrice) : null,
      stockQuantity: product.stockQuantity,
      category: product.category ? {
        id: product.category.id,
        name: product.category.name,
        slug: product.category.slug
      } : null,
      brand: product.brand || '',
      tags: product.tags || [],
      attributes: product.attributes || {},
      images: product.images ? product.images.map(img => img.url || img) : [],
      isActive: product.isActive,
      featured: product.featured || false,
      trending: product.trending || false,
      averageRating: product.averageRating ? parseFloat(product.averageRating) : 0,
      reviewCount: product.reviewCount || 0,
      soldCount: product.soldCount || 0,
      views: product.views || 0,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    };
  }

  /**
   * Reindex all products
   */
  async reindexAllProducts(products) {
    try {
      // Delete existing index
      const exists = await client.indices.exists({ index: PRODUCTS_INDEX });
      if (exists) {
        await client.indices.delete({ index: PRODUCTS_INDEX });
        logger.info('Deleted existing index');
      }

      // Recreate index
      await this.initializeIndices();

      // Bulk index
      await this.bulkIndexProducts(products);

      logger.info('Reindexing completed successfully');
      return true;
    } catch (error) {
      logger.error('Reindex error:', error);
      throw error;
    }
  }
}

module.exports = new ElasticsearchService();