const { Product, InventoryLog } = require('../models');
const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

class InventoryService {

  /**
   * Update inventory with logging
   */
  async updateInventory(productId, quantityChange, type, userId, orderId = null, notes = '') {
    const transaction = await sequelize.transaction();

    try {
      const product = await Product.findByPk(productId, { transaction });

      if (!product) {
        throw new Error('Product not found');
      }

      const previousQuantity = product.stockQuantity;
      const newQuantity = previousQuantity + quantityChange;

      if (newQuantity < 0) {
        throw new Error('Insufficient inventory');
      }

      // Update product stock
      await product.update({ stockQuantity: newQuantity }, { transaction });

      // Create inventory log
      await InventoryLog.create({
        productId,
        type,
        quantityChange,
        previousQuantity,
        newQuantity,
        orderId,
        userId,
        notes
      }, { transaction });

      await transaction.commit();

      logger.info(`Inventory updated for product ${productId}: ${previousQuantity} -> ${newQuantity}`);

      return { previousQuantity, newQuantity, product };
    } catch (error) {
      await transaction.rollback();
      logger.error('Update inventory error:', error);
      throw error;
    }
  }

  /**
   * Bulk inventory adjustment
   */
  async bulkAdjustInventory(adjustments, userId) {
    const transaction = await sequelize.transaction();

    try {
      const results = [];

      for (const adjustment of adjustments) {
        const { productId, quantity, notes } = adjustment;
        
        const product = await Product.findByPk(productId, { transaction });
        if (!product) continue;

        const previousQuantity = product.stockQuantity;
        const quantityChange = quantity - previousQuantity;

        await product.update({ stockQuantity: quantity }, { transaction });

        await InventoryLog.create({
          productId,
          type: 'adjustment',
          quantityChange,
          previousQuantity,
          newQuantity: quantity,
          userId,
          notes
        }, { transaction });

        results.push({ productId, previousQuantity, newQuantity: quantity });
      }

      await transaction.commit();
      return results;
    } catch (error) {
      await transaction.rollback();
      logger.error('Bulk adjust inventory error:', error);
      throw error;
    }
  }

  /**
   * Get inventory history
   */
  async getInventoryHistory(productId, limit = 50) {
    try {
      const logs = await InventoryLog.findAll({
        where: { productId },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email']
          },
          {
            model: Order,
            as: 'order',
            attributes: ['id', 'orderNumber']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit
      });

      return logs;
    } catch (error) {
      logger.error('Get inventory history error:', error);
      throw error;
    }
  }

  /**
   * Get low stock report
   */
  async getLowStockReport() {
    try {
      const products = await Product.findAll({
        where: {
          stockQuantity: {
            [Op.gt]: 0,
            [Op.lte]: sequelize.col('lowStockThreshold')
          },
          isActive: true
        },
        include: [{
          model: Category,
          as: 'category',
          attributes: ['name']
        }],
        order: [['stockQuantity', 'ASC']]
      });

      return products;
    } catch (error) {
      logger.error('Get low stock report error:', error);
      throw error;
    }
  }

  /**
   * Get inventory valuation
   */
  async getInventoryValuation() {
    try {
      const products = await Product.findAll({
        where: { isActive: true },
        attributes: [
          'id',
          'name',
          'sku',
          'price',
          'stockQuantity',
          [sequelize.literal('price * "stockQuantity"'), 'totalValue']
        ]
      });

      const totalValue = products.reduce((sum, product) => {
        return sum + (parseFloat(product.price) * product.stockQuantity);
      }, 0);

      return {
        products,
        totalValue: totalValue.toFixed(2),
        totalProducts: products.length,
        totalUnits: products.reduce((sum, p) => sum + p.stockQuantity, 0)
      };
    } catch (error) {
      logger.error('Get inventory valuation error:', error);
      throw error;
    }
  }
}

module.exports = new InventoryService();