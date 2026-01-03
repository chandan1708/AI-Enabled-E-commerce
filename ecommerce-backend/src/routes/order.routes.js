const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { authenticate } = require('../middleware/auth.middleware');
const validate = require('../middleware/validation.middleware');
const { 
  createOrderSchema, 
  verifyPaymentSchema,
  cancelOrderSchema 
} = require('../validators/order.validator');

// All order routes require authentication
router.use(authenticate);

// Create order
router.post('/', validate(createOrderSchema), orderController.createOrder);

// Verify payment
router.post('/verify-payment', validate(verifyPaymentSchema), orderController.verifyPayment);

// Handle payment failure
router.post('/payment-failure', orderController.handlePaymentFailure);

// Get user orders
router.get('/', orderController.getUserOrders);

// Get single order
router.get('/:id', orderController.getOrderById);

// Cancel order
router.put('/:id/cancel', validate(cancelOrderSchema), orderController.cancelOrder);

module.exports = router;