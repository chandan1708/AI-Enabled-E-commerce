const syncService = require('../../services/elasticsearch/sync.service');
const elasticsearchService = require('../../services/elasticsearch/elasticsearch.service');
const { client } = require('../../config/elasticsearch');
const logger = require('../../utils/logger');

/**
 * Reindex all products
 */
const reindexProducts = async (req, res) => {
  try {
    const result = await syncService.syncAllProducts();

    res.json({
      success: true,
      message: 'Reindexing completed',
      data: result
    });
  } catch (error) {
    logger.error('Reindex products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reindex products',
      error: error.message
    });
  }
};

/**
 * Sync recent products
 */
const syncRecentProducts = async (req, res) => {
  try {
    const { minutes = 10 } = req.query;

    const result = await syncService.syncRecentProducts(parseInt(minutes));

    res.json({
      success: true,
      message: 'Sync completed',
      data: result
    });
  } catch (error) {
    logger.error('Sync recent products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync products',
      error: error.message
    });
  }
};

/**
 * Get search statistics
 */
const getSearchStats = async (req, res) => {
  try {
    const INDEX_PREFIX = process.env.ELASTICSEARCH_INDEX_PREFIX || 'ecommerce_';
    const PRODUCTS_INDEX = `${INDEX_PREFIX}products`;
    const SEARCH_QUERIES_INDEX = `${INDEX_PREFIX}search_queries`;

    // Get index statistics
    const productsStats = await client.indices.stats({ index: PRODUCTS_INDEX });
    const queriesStats = await client.indices.stats({ index: SEARCH_QUERIES_INDEX });

    // Get top searches
    const topSearches = await client.search({
      index: SEARCH_QUERIES_INDEX,
      body: {
        size: 0,
        aggs: {
          top_searches: {
            terms: {
              field: 'query.keyword',
              size: 20,
              order: { _count: 'desc' }
            }
          },
          searches_with_no_results: {
            filter: {
              term: { resultCount: 0 }
            },
            aggs: {
              failed_queries: {
                terms: {
                  field: 'query.keyword',
                  size: 10
                }
              }
            }
          }
        }
      }
    });

    // Get search volume over time
    const searchVolume = await client.search({
      index: SEARCH_QUERIES_INDEX,
      body: {
        size: 0,
        aggs: {
          searches_over_time: {
            date_histogram: {
              field: 'timestamp',
              calendar_interval: 'day',
              format: 'yyyy-MM-dd'
            }
          }
        }
      }
    });

    res.json({
      success: true,
      data: {
        indexStats: {
          products: {
            totalDocs: productsStats._all.primaries.docs.count,
            storeSize: productsStats._all.primaries.store.size_in_bytes
          },
          searchQueries: {
            totalDocs: queriesStats._all.primaries.docs.count,
            storeSize: queriesStats._all.primaries.store.size_in_bytes
          }
        },
        topSearches: topSearches.aggregations.top_searches.buckets,
        failedSearches: topSearches.aggregations.searches_with_no_results.failed_queries.buckets,
        searchVolume: searchVolume.aggregations.searches_over_time.buckets
      }
    });
  } catch (error) {
    logger.error('Get search stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get search statistics',
      error: error.message
    });
  }
};

/**
 * Test Elasticsearch connection
 */
const testConnection = async (req, res) => {
  try {
    const health = await client.cluster.health();
    const info = await client.info();

    res.json({
      success: true,
      data: {
        connected: true,
        clusterHealth: health.status,
        version: info.version.number,
        clusterName: info.cluster_name
      }
    });
  } catch (error) {
    logger.error('Test connection error:', error);
    res.status(500).json({
      success: false,
      message: 'Elasticsearch connection failed',
      error: error.message
    });
  }
};

/**
 * Get index mapping
 */
const getIndexMapping = async (req, res) => {
  try {
    const INDEX_PREFIX = process.env.ELASTICSEARCH_INDEX_PREFIX || 'ecommerce_';
    const PRODUCTS_INDEX = `${INDEX_PREFIX}products`;

    const mapping = await client.indices.getMapping({ index: PRODUCTS_INDEX });

    res.json({
      success: true,
      data: mapping
    });
  } catch (error) {
    logger.error('Get index mapping error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get index mapping',
      error: error.message
    });
  }
};

module.exports = {
  reindexProducts,
  syncRecentProducts,
  getSearchStats,
  testConnection,
  getIndexMapping
};