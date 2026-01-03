const express = require('express');
const router = express.Router();
const exportController = require('../../controllers/admin/export.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

router.use(authenticate, authorize('admin'));

router.get('/products', exportController.exportProducts);
router.get('/orders', exportController.exportOrders);
router.get('/users', exportController.exportUsers);

module.exports = router;