const elasticsearchService = require('../services/elasticsearch/elasticsearch.service');
const { Product, Category } = require('../models');
const logger = require('../utils/logger');
const nlpService = require('../services/search/nlp.service');

/**
 * Search products
 */
const searchProducts = async (req, res) => {
  try {
    const {
      q: query,
      page = 1,
      limit = 20,
      categoryId,
      minPrice,
      maxPrice,
      brands,
      tags,
      inStock,
      sortBy = 'relevance'
    } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      categoryId,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      brands: brands ? brands.split(',') : undefined,
      tags: tags ? tags.split(',') : undefined,
      inStock: inStock === 'true',
      sortBy,
      userId: req.user?.userId
    };

    const results = await elasticsearchService.search(query, options);

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    logger.error('Search products error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed',
      error: error.message
    });
  }
};

/**
 * Get autocomplete suggestions
 */
const getAutocomplete = async (req, res) => {
  try {
    const { q: query, limit = 5 } = req.query;

    if (!query || query.trim().length < 2) {
      return res.json({
        success: true,
        data: []
      });
    }

    const suggestions = await elasticsearchService.getSuggestions(
      query,
      parseInt(limit)
    );

    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    logger.error('Get autocomplete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get suggestions',
      error: error.message
    });
  }
};

/**
 * Search as you type
 */
const searchAsYouType = async (req, res) => {
  try {
    const { q: query, limit = 10 } = req.query;

    if (!query || query.trim().length < 2) {
      return res.json({
        success: true,
        data: []
      });
    }

    const products = await elasticsearchService.searchAsYouType(
      query,
      parseInt(limit)
    );

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    logger.error('Search as you type error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed',
      error: error.message
    });
  }
};

/**
 * Get trending searches
 */
const getTrendingSearches = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const trending = await elasticsearchService.getTrendingSearches(
      parseInt(limit)
    );

    res.json({
      success: true,
      data: trending
    });
  } catch (error) {
    logger.error('Get trending searches error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get trending searches',
      error: error.message
    });
  }
};

/**
 * Get search filters/facets
 */
const getSearchFilters = async (req, res) => {
  try {
    const { q: query } = req.query;

    // Perform search to get aggregations
    const results = await elasticsearchService.search(query || '', {
      page: 1,
      limit: 0 // We only need aggregations
    });

    res.json({
      success: true,
      data: {
        categories: results.aggregations.categories.buckets,
        brands: results.aggregations.brands.buckets,
        priceRanges: results.aggregations.price_ranges.buckets,
        priceStats: {
          avg: results.aggregations.avg_price.value,
          min: results.aggregations.min_price.value,
          max: results.aggregations.max_price.value
        }
      }
    });
  } catch (error) {
    logger.error('Get search filters error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get filters',
      error: error.message
    });
  }
};

/**
 * Natural language search
 */
const naturalLanguageSearch = async (req, res) => {
    try {
      const { q: query, page = 1, limit = 20 } = req.query;
  
      if (!query || query.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Search query required'
        });
      }
  
      // Parse natural language query
      const parsed = nlpService.parseNaturalQuery(query);
      const intent = nlpService.extractIntent(query);
  
      // Build search query from parsed data
      const searchQuery = parsed.keywords.join(' ');
      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        minPrice: parsed.filters.minPrice,
        maxPrice: parsed.filters.maxPrice,
        brands: parsed.filters.brands,
        userId: req.user?.userId
      };
  
      // Perform search
      const results = await elasticsearchService.search(searchQuery, options);
  
      res.json({
        success: true,
        data: {
          ...results,
          parsed: parsed,
          intent: intent,
          originalQuery: query
        }
      });
    } catch (error) {
      logger.error('Natural language search error:', error);
      res.status(500).json({
        success: false,
        message: 'Search failed',
        error: error.message
      });
    }
  };

module.exports = {
  searchProducts,
  getAutocomplete,
  searchAsYouType,
  getTrendingSearches,
  getSearchFilters,
  naturalLanguageSearch
};