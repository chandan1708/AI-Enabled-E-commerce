const express = require('express');
const router = express.Router();
const analyticsController = require('../../controllers/admin/analytics.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

router.use(authenticate, authorize('admin'));

router.get('/dashboard', analyticsController.getDashboardOverview);
router.get('/sales', analyticsController.getSalesAnalytics);
router.get('/customers', analyticsController.getCustomerAnalytics);
router.get('/products', analyticsController.getProductPerformance);

module.exports = router;