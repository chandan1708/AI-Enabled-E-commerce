const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const validate = require('../middleware/validation.middleware');
const { createProductSchema, updateProductSchema } = require('../validators/product.validator');

// Public routes
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);

// Admin routes
router.post('/',
  authenticate,
  authorize('admin'),
  validate(createProductSchema),
  productController.createProduct
);

router.put('/:id',
  authenticate,
  authorize('admin'),
  validate(updateProductSchema),
  productController.updateProduct
);

router.delete('/:id',
  authenticate,
  authorize('admin'),
  productController.deleteProduct
);

module.exports = router;