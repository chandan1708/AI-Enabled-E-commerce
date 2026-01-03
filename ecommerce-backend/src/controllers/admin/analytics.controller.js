const { Order, OrderItem, Product, User, Category } = require('../../models');
const { Op } = require('sequelize');
const { sequelize } = require('../../config/database');
const logger = require('../../utils/logger');

/**
 * Get dashboard overview
 */
const getDashboardOverview = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // Total revenue
    const totalRevenue = await Order.sum('finalAmount', {
      where: {
        ...dateFilter,
        paymentStatus: 'completed'
      }
    });

    // Total orders
    const totalOrders = await Order.count({ where: dateFilter });

    // Total customers
    const totalCustomers = await User.count({ where: { role: 'customer' } });

    // Total products
    const totalProducts = await Product.count({ where: { isActive: true } });

    // Orders by status
    const ordersByStatus = await Order.findAll({
      where: dateFilter,
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    // Revenue trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const revenueTrend = await Order.findAll({
      where: {
        createdAt: { [Op.gte]: thirtyDaysAgo },
        paymentStatus: 'completed'
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('SUM', sequelize.col('finalAmount')), 'revenue'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'orders']
      ],
      group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
      order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']],
      raw: true
    });

    // Top selling products
    const topProducts = await OrderItem.findAll({
      attributes: [
        'productId',
        [sequelize.fn('SUM', sequelize.col('quantity')), 'totalSold'],
        [sequelize.fn('SUM', sequelize.literal('quantity * price')), 'revenue']
      ],
      include: [{
        model: Product,
        as: 'product',
        attributes: ['id', 'name', 'images', 'price']
      }],
      group: ['productId', 'product.id'],
      order: [[sequelize.fn('SUM', sequelize.col('quantity')), 'DESC']],
      limit: 10,
      raw: false
    });

    // Recent orders
    const recentOrders = await Order.findAll({
      limit: 10,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        },
        {
          model: OrderItem,
          as: 'items',
          limit: 1,
          include: [{
            model: Product,
            as: 'product',
            attributes: ['name']
          }]
        }
      ]
    });

    // Low stock alerts
    const lowStockProducts = await Product.count({
      where: {
        stockQuantity: {
          [Op.gt]: 0,
          [Op.lte]: sequelize.col('lowStockThreshold')
        },
        isActive: true
      }
    });

    res.json({
      success: true,
      data: {
        overview: {
          totalRevenue: parseFloat(totalRevenue || 0).toFixed(2),
          totalOrders,
          totalCustomers,
          totalProducts,
          lowStockAlerts: lowStockProducts
        },
        ordersByStatus,
        revenueTrend,
        topProducts,
        recentOrders
      }
    });
  } catch (error) {
    logger.error('Get dashboard overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: error.message
    });
  }
};

/**
 * Get sales analytics
 */
const getSalesAnalytics = async (req, res) => {
  try {
    const { period = 'month' } = req.query; // day, week, month, year

    let dateFormat, dateInterval;
    switch (period) {
      case 'day':
        dateFormat = 'hour';
        dateInterval = '1 day';
        break;
      case 'week':
        dateFormat = 'day';
        dateInterval = '7 days';
        break;
      case 'year':
        dateFormat = 'month';
        dateInterval = '1 year';
        break;
      default:
        dateFormat = 'day';
        dateInterval = '30 days';
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(dateInterval));

    const salesData = await Order.findAll({
      where: {
        createdAt: { [Op.gte]: startDate },
        paymentStatus: 'completed'
      },
      attributes: [
        [sequelize.fn('DATE_TRUNC', dateFormat, sequelize.col('createdAt')), 'period'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'orderCount'],
        [sequelize.fn('SUM', sequelize.col('finalAmount')), 'revenue'],
        [sequelize.fn('AVG', sequelize.col('finalAmount')), 'averageOrderValue']
      ],
      group: [sequelize.fn('DATE_TRUNC', dateFormat, sequelize.col('createdAt'))],
      order: [[sequelize.fn('DATE_TRUNC', dateFormat, sequelize.col('createdAt')), 'ASC']],
      raw: true
    });

    // Category-wise sales
    const categoryWiseSales = await OrderItem.findAll({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('quantity')), 'totalSold'],
        [sequelize.fn('SUM', sequelize.literal('quantity * "OrderItem"."price"')), 'revenue']
      ],
      include: [{
        model: Product,
        as: 'product',
        attributes: [],
        include: [{
          model: Category,
          as: 'category',
          attributes: ['id', 'name']
        }]
      }],
      group: ['product.category.id', 'product.category.name'],
      raw: false
    });

    res.json({
      success: true,
      data: {
        period,
        salesData,
        categoryWiseSales
      }
    });
  } catch (error) {
    logger.error('Get sales analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales analytics',
      error: error.message
    });
  }
};

/**
 * Get customer analytics
 */
const getCustomerAnalytics = async (req, res) => {
  try {
    // Customer lifetime value
    const customerLTV = await Order.findAll({
      where: { paymentStatus: 'completed' },
      attributes: [
        'userId',
        [sequelize.fn('COUNT', sequelize.col('Order.id')), 'orderCount'],
        [sequelize.fn('SUM', sequelize.col('finalAmount')), 'totalSpent'],
        [sequelize.fn('AVG', sequelize.col('finalAmount')), 'averageOrderValue']
      ],
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'createdAt']
      }],
      group: ['userId', 'user.id'],
      order: [[sequelize.fn('SUM', sequelize.col('finalAmount')), 'DESC']],
      limit: 50,
      raw: false
    });

    // New vs returning customers
    const newVsReturning = await sequelize.query(`
      SELECT 
        CASE 
          WHEN order_count = 1 THEN 'new'
          ELSE 'returning'
        END as customer_type,
        COUNT(*) as count
      FROM (
        SELECT "userId", COUNT(*) as order_count
        FROM orders
        WHERE "paymentStatus" = 'completed'
        GROUP BY "userId"
      ) as customer_orders
      GROUP BY customer_type
    `, { type: sequelize.QueryTypes.SELECT });

    // Customer acquisition by month
    const customerAcquisition = await User.findAll({
      where: { role: 'customer' },
      attributes: [
        [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('createdAt')), 'month'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('createdAt'))],
      order: [[sequelize.fn('DATE_TRUNC', 'month', sequelize.col('createdAt')), 'ASC']],
      raw: true,
      limit: 12
    });

    res.json({
      success: true,
      data: {
        topCustomers: customerLTV,
        newVsReturning,
        customerAcquisition
      }
    });
  } catch (error) {
    logger.error('Get customer analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer analytics',
      error: error.message
    });
  }
};

/**
 * Get product performance
 */
const getProductPerformance = async (req, res) => {
  try {
    // Best performing products
    const bestPerformers = await OrderItem.findAll({
      attributes: [
        'productId',
        [sequelize.fn('SUM', sequelize.col('quantity')), 'unitsSold'],
        [sequelize.fn('SUM', sequelize.literal('quantity * price')), 'revenue'],
        [sequelize.fn('COUNT', sequelize.literal('DISTINCT "OrderItem"."orderId"')), 'orderCount']
      ],
      include: [{
        model: Product,
        as: 'product',
        attributes: ['id', 'name', 'price', 'stockQuantity', 'averageRating']
      }],
      group: ['productId', 'product.id'],
      order: [[sequelize.fn('SUM', sequelize.literal('quantity * price')), 'DESC']],
      limit: 20,
      raw: false
    });

    // Worst performing products (active but no sales)
    const worstPerformers = await Product.findAll({
      where: {
        isActive: true,
        soldCount: { [Op.or]: [0, null] }
      },
      attributes: ['id', 'name', 'price', 'stockQuantity', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 20
    });

    // Products needing restock
    const needsRestock = await Product.findAll({
      where: {
        stockQuantity: {
          [Op.gt]: 0,
          [Op.lte]: sequelize.col('lowStockThreshold')
        },
        isActive: true
      },
      order: [['stockQuantity', 'ASC']],
      limit: 20
    });

    res.json({
      success: true,
      data: {
        bestPerformers,
        worstPerformers,
        needsRestock
      }
    });
  } catch (error) {
    logger.error('Get product performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product performance',
      error: error.message
    });
  }
};

module.exports = {
  getDashboardOverview,
  getSalesAnalytics,
  getCustomerAnalytics,
  getProductPerformance
};