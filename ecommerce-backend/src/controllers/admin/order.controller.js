const { Order, OrderItem, Product, User } = require('../../models');
const { Op } = require('sequelize');
const emailService = require('../../services/email.service');
const logger = require('../../utils/logger');

/**
 * Get all orders (Admin)
 */
const getAllOrders = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            status,
            paymentStatus,
            startDate,
            endDate,
            search
        } = req.query;

        const where = {};

        if (status) where.status = status;
        if (paymentStatus) where.paymentStatus = paymentStatus;

        if (startDate && endDate) {
            where.createdAt = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }

        if (search) {
            where[Op.or] = [
                { orderNumber: { [Op.iLike]: `%${search}%` } },
                { '$user.email': { [Op.iLike]: `%${search}%` } }
            ];
        }

        const offset = (page - 1) * limit;

        const { count, rows: orders } = await Order.findAndCountAll({
            where,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email', 'phone']
                },
                {
                    model: OrderItem,
                    as: 'items',
                    include: [{
                        model: Product,
                        as: 'product',
                        attributes: ['id', 'name', 'images']
                    }]
                }
            ],
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['createdAt', 'DESC']]
        });

        res.json({
            success: true,
            data: {
                orders,
                pagination: {
                    total: count,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(count / limit)
                }
            }
        });
    } catch (error) {
        logger.error('Get all orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders',
            error: error.message
        });
    }
};

/**
 * Update order status (Admin)
 */
const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, trackingNumber, estimatedDelivery, notes } = req.body;

        const order = await Order.findByPk(id, {
            include: [
                { model: User, as: 'user' },
                { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] }
            ]
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const updateData = {};
        if (status) updateData.status = status;
        if (trackingNumber) updateData.trackingNumber = trackingNumber;
        if (estimatedDelivery) updateData.estimatedDelivery = estimatedDelivery;
        if (notes) updateData.notes = notes;

        // Set delivered date if status is delivered
        if (status === 'delivered') {
            updateData.deliveredAt = new Date();
        }

        await order.update(updateData);

        // Send status update email
        if (status) {
            await emailService.sendOrderStatusUpdate(order, order.user, status);
        }

        logger.info(`Order ${order.orderNumber} status updated to ${status} by admin`);

        res.json({
            success: true,
            message: 'Order updated successfully',
            data: order
        });
    } catch (error) {
        logger.error('Update order status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update order',
            error: error.message
        });
    }
};

/**
 * Get order statistics (Admin)
 */
const getOrderStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const dateFilter = {};
        if (startDate && endDate) {
            dateFilter.createdAt = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }

        // Total orders and revenue
        const totalOrders = await Order.count({ where: dateFilter });

        const revenue = await Order.sum('finalAmount', {
            where: {
                ...dateFilter,
                paymentStatus: 'completed'
            }
        });

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

        // Orders by payment status
        const ordersByPaymentStatus = await Order.findAll({
            where: dateFilter,
            attributes: [
                'paymentStatus',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: ['paymentStatus'],
            raw: true
        });

        // Recent orders
        const recentOrders = await Order.findAll({
            where: dateFilter,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['name', 'email']
                }
            ],
            limit: 10,
            order: [['createdAt', 'DESC']]
        });

        res.json({
            success: true,
            data: {
                totalOrders,
                totalRevenue: revenue || 0,
                ordersByStatus,
                ordersByPaymentStatus,
                recentOrders
            }
        });
    } catch (error) {
        logger.error('Get order stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics',
            error: error.message
        });
    }
};

module.exports = {
    getAllOrders,
    updateOrderStatus,
    getOrderStats
};