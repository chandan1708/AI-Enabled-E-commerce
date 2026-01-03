const cron = require('node-cron');
const syncService = require('../services/elasticsearch/sync.service');
const logger = require('../utils/logger');

class ElasticsearchSyncJob {

  /**
   * Start scheduled sync jobs
   */
  start() {
    // Sync recent products every 10 minutes
    cron.schedule('*/10 * * * *', async () => {
      try {
        logger.info('Running scheduled product sync...');
        await syncService.syncRecentProducts(10);
        logger.info('Scheduled product sync completed');
      } catch (error) {
        logger.error('Scheduled sync error:', error);
      }
    });

    // Full reindex daily at 2 AM
    cron.schedule('0 2 * * *', async () => {
      try {
        logger.info('Running daily full reindex...');
        await syncService.syncAllProducts();
        logger.info('Daily full reindex completed');
      } catch (error) {
        logger.error('Daily reindex error:', error);
      }
    });

    logger.info('Elasticsearch sync jobs scheduled');
  }
}

module.exports = new ElasticsearchSyncJob();