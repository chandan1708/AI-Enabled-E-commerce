const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');

// Razorpay webhook (no authentication required)
router.post('/razorpay', webhookController.handleRazorpayWebhook);

module.exports = router;