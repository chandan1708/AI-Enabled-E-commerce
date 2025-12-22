const { Order, OrderItem, Cart, Product, User } = require('../models');
const { sequelize } = require('../config/database');
const paymentService = require('../services/payment.service');
const emailService = require('../services/email.service');
const logger = require('../utils/logger');

/**
 * Create order from cart
 */
const createOrder = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.userId;
    const { shippingAddress, billingAddress, paymentMethod = 'razorpay', notes } = req.body;

    // Validate shipping address
    if (!shippingAddress || !shippingAddress.name || !shippingAddress.phone ||
      !shippingAddress.addressLine1 || !shippingAddress.city ||
      !shippingAddress.state || !shippingAddress.pincode) {
      return res.status(400).json({
        success: false,
        message: 'Complete shipping address is required'
      });
    }

    // Get cart items with products
    const cartItems = await Cart.findAll({
      where: { userId },
      include: [{
        model: Product,
        as: 'product',
        where: { isActive: true }
      }],
      transaction
    });

    if (cartItems.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Validate stock availability
    for (const item of cartItems) {
      if (item.product.stockQuantity < item.quantity) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${item.product.name}`
        });
      }
    }

    // Calculate total amount
    let totalAmount = 0;
    const orderItemsData = [];

    for (const item of cartItems) {
      const price = item.product.discountPrice || item.product.price;
      const itemTotal = parseFloat(price) * item.quantity;
      totalAmount += itemTotal;

      orderItemsData.push({
        productId: item.productId,
        quantity: item.quantity,
        price: price
      });
    }

    // Calculate tax and shipping (you can customize this logic)
    const tax = totalAmount * 0.18; // 18% GST
    const shippingCharge = totalAmount > 500 ? 0 : 50; // Free shipping above ₹500
    const finalAmount = totalAmount + tax + shippingCharge;

    // Create order
    const order = await Order.create({
      userId,
      totalAmount,
      tax,
      shippingCharge,
      finalAmount,
      paymentMethod,
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      notes,
      status: paymentMethod === 'cod' ? 'confirmed' : 'pending',
      paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending'
    }, { transaction });

    // Create order items
    for (const itemData of orderItemsData) {
      await OrderItem.create({
        orderId: order.id,
        ...itemData
      }, { transaction });
    }

    // Clear cart
    await Cart.destroy({ where: { userId }, transaction });

    // If COD, mark as confirmed and reduce stock
    if (paymentMethod === 'cod') {
      for (const item of cartItems) {
        await item.product.decrement('stockQuantity', {
          by: item.quantity,
          transaction
        });
      }
    }

    await transaction.commit();

    // Fetch complete order with items
    const completeOrder = await Order.findByPk(order.id, {
      include: [{
        model: OrderItem,
        as: 'items',
        include: [{
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'images', 'price', 'discountPrice']
        }]
      }]
    });

    // If online payment, create Razorpay order
    let paymentData = null;
    if (paymentMethod === 'razorpay') {
      paymentData = await paymentService.createRazorpayOrder(order.id);
    } else {
      // Send order confirmation for COD
      const user = await User.findByPk(userId);
      await emailService.sendOrderConfirmation(completeOrder, user);
    }

    logger.info(`Order created: ${order.orderNumber} by user: ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        order: completeOrder,
        payment: paymentData
      }
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message
    });
  }
};

/**
 * Verify payment and complete order
 */
const verifyPayment = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: 'Missing payment details'
      });
    }

    // Handle successful payment
    const order = await paymentService.handleSuccessfulPayment({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    });

    // Send confirmation emails
    const user = await User.findByPk(order.userId);
    await emailService.sendPaymentSuccess(order, user);
    await emailService.sendOrderConfirmation(order, user);

    res.json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status
      }
    });
  } catch (error) {
    logger.error('Verify payment error:', error);
    res.status(400).json({
      success: false,
      message: 'Payment verification failed',
      error: error.message
    });
  }
};

/**
 * Handle payment failure
 */
const handlePaymentFailure = async (req, res) => {
  try {
    const { razorpayOrderId, error } = req.body;

    await paymentService.handleFailedPayment(razorpayOrderId, error);

    res.json({
      success: false,
      message: 'Payment failed',
      error: error
    });
  } catch (error) {
    logger.error('Handle payment failure error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to handle payment failure',
      error: error.message
    });
  }
};

/**
 * Get user orders
 */
const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10, status } = req.query;

    const where = { userId };
    if (status) {
      where.status = status;
    }

    const offset = (page - 1) * limit;

    const { count, rows: orders } = await Order.findAndCountAll({
      where,
      include: [{
        model: OrderItem,
        as: 'items',
        include: [{
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'images', 'price', 'discountPrice']
        }]
      }],
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
    logger.error('Get user orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
};

/**
 * Get single order
 */
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const order = await Order.findOne({
      where: { id, userId },
      include: [{
        model: OrderItem,
        as: 'items',
        include: [{
          model: Product,
          as: 'product'
        }]
      }]
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    logger.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
      error: error.message
    });
  }
};

/**
 * Cancel order
 */
const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { cancelReason } = req.body;

    const order = await Order.findOne({
      where: { id, userId },
      include: [{
        model: OrderItem,
        as: 'items',
        include: [{ model: Product, as: 'product' }]
      }]
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order can be cancelled
    if (['shipped', 'delivered', 'cancelled'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order in ${order.status} status`
      });
    }

    // Update order status
    await order.update({
      status: 'cancelled',
      cancelReason: cancelReason || 'Cancelled by user'
    });

    // Restore product stock if order was confirmed
    if (order.status === 'confirmed' || order.paymentStatus === 'completed') {
      for (const item of order.items) {
        await item.product.increment('stockQuantity', { by: item.quantity });
      }

      // Initiate refund if payment was completed
      if (order.paymentStatus === 'completed') {
        await paymentService.initiateRefund(order.id);
      }
    }

    // Send cancellation email
    const user = await User.findByPk(userId);
    await emailService.sendOrderCancellation(order, user);

    logger.info(`Order cancelled: ${order.orderNumber}`);

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: order
    });
  } catch (error) {
    logger.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel order',
      error: error.message
    });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  handlePaymentFailure,
  getUserOrders,
  getOrderById,
  cancelOrder
};