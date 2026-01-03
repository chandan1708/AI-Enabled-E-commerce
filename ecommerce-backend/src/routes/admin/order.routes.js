const express = require('express');
const router = express.Router();
const adminOrderController = require('../../controllers/admin/order.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

// All routes require admin authentication
router.use(authenticate, authorize('admin'));

router.get('/', adminOrderController.getAllOrders);
router.get('/stats', adminOrderController.getOrderStats);
router.put('/:id/status', adminOrderController.updateOrderStatus);

module.exports = router;