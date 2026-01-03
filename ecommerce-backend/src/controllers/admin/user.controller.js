const { User, Order } = require('../../models');
const { Op } = require('sequelize');
const { sequelize } = require('../../config/database');
const logger = require('../../utils/logger');

/**
 * Get all users
 */
const getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      role,
      isActive,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const where = {};

    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;

    const { count, rows: users } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      include: [{
        model: Order,
        as: 'orders',
        attributes: []
      }],
      attributes: {
        include: [
          [sequelize.fn('COUNT', sequelize.col('orders.id')), 'orderCount'],
          [sequelize.fn('SUM', sequelize.col('orders.finalAmount')), 'totalSpent']
        ]
      },
      group: ['User.id'],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder]],
      subQuery: false
    });

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          total: count.length,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count.length / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
};

/**
 * Get user details
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] },
      include: [{
        model: Order,
        as: 'orders',
        limit: 10,
        order: [['createdAt', 'DESC']]
      }]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user statistics
    const stats = await Order.findOne({
      where: { userId: id },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalOrders'],
        [sequelize.fn('SUM', sequelize.col('finalAmount')), 'totalSpent'],
        [sequelize.fn('AVG', sequelize.col('finalAmount')), 'averageOrderValue']
      ],
        raw: true
      });
      res.json({
        success: true,
        data: {
          user,
          statistics: stats
        }
      });
    } catch (error) {
      logger.error('Get user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user',
        error: error.message
      });
    }
  };
  
  /**
   * Update user role
   */
  const updateUserRole = async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
  
      if (!['customer', 'admin'].includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role. Must be customer or admin'
        });
      }
  
      const user = await User.findByPk(id);
  
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
  
      await user.update({ role });
  
      logger.info(`User ${user.email} role updated to ${role}`);
  
      res.json({
        success: true,
        message: 'User role updated successfully',
        data: user
      });
    } catch (error) {
      logger.error('Update user role error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user role',
        error: error.message
      });
    }
  };
  
  /**
   * Toggle user active status
   */
  const toggleUserStatus = async (req, res) => {
    try {
      const { id } = req.params;
  
      const user = await User.findByPk(id);
  
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
  
      await user.update({ isActive: !user.isActive });
  
      logger.info(`User ${user.email} status toggled to ${user.isActive}`);
  
      res.json({
        success: true,
        message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
        data: user
      });
    } catch (error) {
      logger.error('Toggle user status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user status',
        error: error.message
      });
    }
  };
  
  /**
   * Get user statistics
   */
  const getUserStats = async (req, res) => {
    try {
      const totalUsers = await User.count();
      const activeUsers = await User.count({ where: { isActive: true } });
      const adminUsers = await User.count({ where: { role: 'admin' } });
  
      // New users this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
  
      const newUsersThisMonth = await User.count({
        where: {
          createdAt: { [Op.gte]: startOfMonth }
        }
      });
  
      // User growth by month
      const userGrowth = await User.findAll({
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
          totalUsers,
          activeUsers,
          adminUsers,
          inactiveUsers: totalUsers - activeUsers,
          newUsersThisMonth,
          userGrowth
        }
      });
    } catch (error) {
      logger.error('Get user stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user statistics',
        error: error.message
      });
    }
  };
  
  module.exports = {
    getAllUsers,
    getUserById,
    updateUserRole,
    toggleUserStatus,
    getUserStats
  };

    