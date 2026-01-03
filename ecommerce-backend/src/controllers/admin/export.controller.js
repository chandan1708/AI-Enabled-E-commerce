const { Product, Order, User, Category } = require('../../models');
const exportService = require('../../services/export.service');
const logger = require('../../utils/logger');

/**
 * Export products
 */
const exportProducts = async (req, res) => {
  try {
    const { format = 'excel' } = req.query;

    const products = await Product.findAll({
      include: [{
        model: Category,
        as: 'category',
        attributes: ['name']
      }]
    });

    const buffer = await exportService.exportProducts(products);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=products-${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error) {
    logger.error('Export products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export products',
      error: error.message
    });
  }
};

/**
 * Export orders
 */
const exportOrders = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {};
    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const orders = await Order.findAll({
      where,
      include: [{
        model: User,
        as: 'user',
        attributes: ['name', 'email']
      }]
    });

    const buffer = await exportService.exportOrders(orders);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=orders-${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error) {
    logger.error('Export orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export orders',
      error: error.message
    });
  }
};

/**
 * Export users
 */
const exportUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] }
    });

    const buffer = await exportService.exportUsers(users);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=users-${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error) {
    logger.error('Export users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export users',
      error: error.message
    });
  }
};

module.exports = {
  exportProducts,
  exportOrders,
  exportUsers
};