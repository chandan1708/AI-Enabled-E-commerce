const inventoryService = require('../../services/inventory.service');
const logger = require('../../utils/logger');

/**
 * Adjust inventory
 */
const adjustInventory = async (req, res) => {
  try {
    const { productId, quantity, notes } = req.body;
    const userId = req.user.userId;

    const result = await inventoryService.updateInventory(
      productId,
      quantity,
      'adjustment',
      userId,
      null,
      notes
    );

    res.json({
      success: true,
      message: 'Inventory adjusted successfully',
      data: result
    });
  } catch (error) {
    logger.error('Adjust inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to adjust inventory',
      error: error.message
    });
  }
};

/**
 * Bulk adjust inventory
 */
const bulkAdjustInventory = async (req, res) => {
  try {
    const { adjustments } = req.body;
    const userId = req.user.userId;

    const results = await inventoryService.bulkAdjustInventory(adjustments, userId);

    res.json({
      success: true,
      message: 'Bulk inventory adjustment completed',
      data: results
    });
  } catch (error) {
    logger.error('Bulk adjust inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to adjust inventory',
      error: error.message
    });
  }
};

/**
 * Get inventory history
 */
const getInventoryHistory = async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit = 50 } = req.query;

    const logs = await inventoryService.getInventoryHistory(productId, limit);

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    logger.error('Get inventory history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory history',
      error: error.message
    });
  }
};

/**
 * Get inventory valuation
 */
const getInventoryValuation = async (req, res) => {
  try {
    const valuation = await inventoryService.getInventoryValuation();

    res.json({
      success: true,
      data: valuation
    });
  } catch (error) {
    logger.error('Get inventory valuation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory valuation',
      error: error.message
    });
  }
};

module.exports = {
  adjustInventory,
  bulkAdjustInventory,
  getInventoryHistory,
  getInventoryValuation
};