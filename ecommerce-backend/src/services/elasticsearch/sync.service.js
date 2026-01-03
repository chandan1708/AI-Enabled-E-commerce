const elasticsearchService = require('./elasticsearch.service');
const { Product, Category } = require('../../models');
const logger = require('../../utils/logger');

class SyncService {

  /**
   * Sync single product
   */
  async syncProduct(productId) {
    try {
      const product = await Product.findByPk(productId, {
        include: [{
          model: Category,
          as: 'category'
        }]
      });

      if (!product) {
        logger.warn(`Product ${productId} not found for sync`);
        return false;
      }

      await elasticsearchService.indexProduct(product);
      return true;
    } catch (error) {
      logger.error('Sync product error:', error);
      throw error;
    }
  }

  /**
   * Sync all products
   */
  async syncAllProducts() {
    try {
      logger.info('Starting full product sync...');

      const products = await Product.findAll({
        include: [{
          model: Category,
          as: 'category'
        }]
      });

      logger.info(`Found ${products.length} products to sync`);

      // Reindex all products
      await elasticsearchService.reindexAllProducts(products);

      logger.info('Full product sync completed');
      return { success: true, count: products.length };
    } catch (error) {
      logger.error('Sync all products error:', error);
      throw error;
    }
  }

  /**
   * Sync products incrementally (last N minutes)
   */
  async syncRecentProducts(minutes = 10) {
    try {
      const since = new Date();
      since.setMinutes(since.getMinutes() - minutes);

      const products = await Product.findAll({
        where: {
          updatedAt: {
            [Op.gte]: since
          }
        },
        include: [{
          model: Category,
          as: 'category'
        }]
      });

      if (products.length === 0) {
        logger.info('No products to sync');
        return { success: true, count: 0 };
      }

      await elasticsearchService.bulkIndexProducts(products);

      logger.info(`Synced ${products.length} recent products`);
      return { success: true, count: products.length };
    } catch (error) {
      logger.error('Sync recent products error:', error);
      throw error;
    }
  }
}

module.exports = new SyncService();