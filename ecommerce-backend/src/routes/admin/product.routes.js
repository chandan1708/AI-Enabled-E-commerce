const express = require('express');
const router = express.Router();
const productController = require('../../controllers/admin/product.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const upload = require('../../middleware/upload.middleware');
const validate = require('../../middleware/validation.middleware');

// All routes require admin authentication
router.use(authenticate, authorize('admin'));

// Product CRUD
router.get('/', productController.getAllProducts);
router.post('/', upload.array('images', 5), productController.createProduct);
router.put('/:id', upload.array('images', 5), productController.updateProduct);
router.delete('/:id/image', productController.deleteProductImage);

// Bulk operations
router.post('/bulk-update', productController.bulkUpdateProducts);
router.post('/bulk-delete', productController.bulkDeleteProducts);

// Analytics
router.get('/:id/analytics', productController.getProductAnalytics);
router.get('/low-stock/all', productController.getLowStockProducts);

module.exports = router;