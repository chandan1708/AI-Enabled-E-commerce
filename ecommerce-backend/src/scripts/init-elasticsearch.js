const { connectDB } = require('../config/database');
const elasticsearchService = require('../services/elasticsearch/elasticsearch.service');
const syncService = require('../services/elasticsearch/sync.service');
const logger = require('../utils/logger');

async function initializeElasticsearch() {
  try {
    logger.info('Starting Elasticsearch initialization...');

    // Connect to database
    await connectDB();

    // Initialize indices
    await elasticsearchService.initializeIndices();
    logger.info(' Indices created');

    // Sync all products
    await syncService.syncAllProducts();
    logger.info(' Products synced');

    logger.info(' Elasticsearch initialization completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Initialization failed:', error);
    process.exit(1);
  }
}

initializeElasticsearch();