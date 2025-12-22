const paymentService = require('../services/payment.service');
const emailService = require('../services/email.service');
const { Order, User } = require('../models');
const logger = require('../utils/logger');

/**
 * Handle Razorpay webhooks
 */
const handleRazorpayWebhook = async (req, res) => {
  try {
    const webhookSignature = req.headers['x-razorpay-signature'];
    const webhookBody = req.body;

    // Verify webhook signature
    const isValid = paymentService.verifyWebhookSignature(webhookBody, webhookSignature);

    if (!isValid) {
      logger.warn('Invalid webhook signature');
      return res.status(400).json({
        success: false,
        message: 'Invalid signature'
      });
    }

    const event = webhookBody.event;
    const payload = webhookBody.payload;

    logger.info(`Webhook received: ${event}`);

    switch (event) {
      case 'payment.captured':
        await handlePaymentCaptured(payload.payment.entity);
        break;

      case 'payment.failed':
        await handlePaymentFailed(payload.payment.entity);
        break;

      case 'order.paid':
        await handleOrderPaid(payload.order.entity);
        break;

      case 'refund.created':
        await handleRefundCreated(payload.refund.entity);
        break;

      default:
        logger.info(`Unhandled webhook event: ${event}`);
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed'
    });
  }
};

/**
 * Handle payment captured event
 */
const handlePaymentCaptured = async (payment) => {
  try {
    const order = await Order.findOne({
      where: { razorpayOrderId: payment.order_id },
      include: [
        { model: User, as: 'user' },
        { model: OrderItem, as: 'items' }
      ]
    });

    if (order && order.paymentStatus !== 'completed') {
      await order.update({
        paymentStatus: 'completed',
        status: 'confirmed',
        razorpayPaymentId: payment.id
      });

      // Send confirmation email
      await emailService.sendPaymentSuccess(order, order.user);
      await emailService.sendOrderConfirmation(order, order.user);

      logger.info(`Payment captured for order: ${order.orderNumber}`);
    }
  } catch (error) {
    logger.error('Handle payment captured error:', error);
  }
};

/**
 * Handle payment failed event
 */
const handlePaymentFailed = async (payment) => {
  try {
    const order = await Order.findOne({
      where: { razorpayOrderId: payment.order_id }
    });

    if (order) {
      await order.update({
        paymentStatus: 'failed',
        status: 'payment_failed',
        notes: payment.error_description || 'Payment failed'
      });

      logger.info(`Payment failed for order: ${order.orderNumber}`);
    }
  } catch (error) {
    logger.error('Handle payment failed error:', error);
  }
};

/**
 * Handle order paid event
 */
const handleOrderPaid = async (orderData) => {
  try {
    const order = await Order.findOne({
      where: { razorpayOrderId: orderData.id }
    });

    if (order && order.paymentStatus !== 'completed') {
      await order.update({
        paymentStatus: 'completed',
        status: 'confirmed'
      });

      logger.info(`Order paid: ${order.orderNumber}`);
    }
  } catch (error) {
    logger.error('Handle order paid error:', error);
  }
};

/**
 * Handle refund created event
 */
const handleRefundCreated = async (refund) => {
  try {
    const order = await Order.findOne({
      where: { razorpayPaymentId: refund.payment_id },
      include: [{ model: User, as: 'user' }]
    });

    if (order) {
      await order.update({
        paymentStatus: 'refunded',
        status: 'refunded'
      });

      logger.info(`Refund processed for order: ${order.orderNumber}`);
    }
  } catch (error) {
    logger.error('Handle refund created error:', error);
  }
};

module.exports = {
  handleRazorpayWebhook
};