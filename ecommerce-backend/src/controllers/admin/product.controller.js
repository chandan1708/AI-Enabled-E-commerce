const { Product, Category, OrderItem } = require('../../models');
const { Op } = require('sequelize');
const { sequelize } = require('../../config/database');
const uploadService = require('../../services/upload.service');
const redis = require('../../config/redis');
const logger = require('../../utils/logger');

/**
 * Get all products with advanced filters (Admin)
 */
const getAllProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      categoryId,
      search,
      stockStatus,
      featured,
      trending,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      minPrice,
      maxPrice
    } = req.query;

    const where = {};

    if (categoryId) where.categoryId = categoryId;
    if (featured !== undefined) where.featured = featured === 'true';
    if (trending !== undefined) where.trending = trending === 'true';

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { sku: { [Op.iLike]: `%${search}%` } },
        { brand: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price[Op.gte] = minPrice;
      if (maxPrice) where.price[Op.lte] = maxPrice;
    }

    // Stock status filter
    if (stockStatus) {
      switch (stockStatus) {
        case 'out_of_stock':
          where.stockQuantity = 0;
          break;
        case 'low_stock':
          where.stockQuantity = { [Op.gt]: 0, [Op.lte]: sequelize.col('lowStockThreshold') };
          break;
        case 'in_stock':
          where.stockQuantity = { [Op.gt]: sequelize.col('lowStockThreshold') };
          break;
      }
    }

    const offset = (page - 1) * limit;

    const { count, rows: products } = await Product.findAndCountAll({
      where,
      include: [{
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'slug']
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder]]
    });

    // Add stock status to each product
    const productsWithStatus = products.map(product => ({
      ...product.toJSON(),
      stockStatus: product.getStockStatus()
    }));

    res.json({
      success: true,
      data: {
        products: productsWithStatus,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get all products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message
    });
  }
};

/**
 * Create product with images
 */
const createProduct = async (req, res) => {
  try {
    const productData = JSON.parse(req.body.data);
    const files = req.files;

    // Upload images
    let imageUrls = [];
    if (files && files.length > 0) {
      const uploadResults = await uploadService.uploadMultipleImages(files, 'products');
      imageUrls = uploadResults.map(result => ({
        url: result.url,
        publicId: result.publicId
      }));
    }

    // Generate slug
    productData.slug = productData.name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');

    // Check slug uniqueness
    let slugExists = await Product.findOne({ where: { slug: productData.slug } });
    if (slugExists) {
      productData.slug = `${productData.slug}-${Date.now()}`;
    }

    // Add images to product data
    productData.images = imageUrls;

    // Create product
    const product = await Product.create(productData);

    // Clear cache
    await redis.del('products:*');

    logger.info(`Product created: ${product.id} by admin`);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    logger.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create product',
      error: error.message
    });
  }
};

/**
 * Update product with images
 */
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const productData = req.body.data ? JSON.parse(req.body.data) : req.body;
    const files = req.files;

    const product = await Product.findByPk(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Handle new image uploads
    if (files && files.length > 0) {
      const uploadResults = await uploadService.uploadMultipleImages(files, 'products');
      const newImages = uploadResults.map(result => ({
        url: result.url,
        publicId: result.publicId
      }));

      // Merge with existing images if keepExisting is true
      if (productData.keepExistingImages) {
        productData.images = [...(product.images || []), ...newImages];
      } else {
        // Delete old images
        if (product.images && product.images.length > 0) {
          const publicIds = product.images.map(img => img.publicId).filter(Boolean);
          if (publicIds.length > 0) {
            await uploadService.deleteMultipleImages(publicIds);
          }
        }
        productData.images = newImages;
      }
    }

    // Update slug if name changed
    if (productData.name && productData.name !== product.name) {
      productData.slug = productData.name
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');
    }

    await product.update(productData);

    // Clear cache
    await redis.del('products:*');

    logger.info(`Product updated: ${product.id}`);

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    logger.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product',
      error: error.message
    });
  }
};

/**
 * Delete product image
 */
const deleteProductImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { imageIndex } = req.body;

    const product = await Product.findByPk(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (!product.images || imageIndex >= product.images.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image index'
      });
    }

    const imageToDelete = product.images[imageIndex];

    // Delete from Cloudinary
    if (imageToDelete.publicId) {
      await uploadService.deleteImage(imageToDelete.publicId);
    }

    // Remove from array
    const updatedImages = product.images.filter((_, index) => index !== imageIndex);
    await product.update({ images: updatedImages });

    res.json({
      success: true,
      message: 'Image deleted successfully',
      data: product
    });
  } catch (error) {
    logger.error('Delete product image error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete image',
      error: error.message
    });
  }
};

/**
 * Bulk update products
 */
const bulkUpdateProducts = async (req, res) => {
  try {
    const { productIds, updates } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Product IDs array is required'
      });
    }

    const allowedUpdates = ['isActive', 'featured', 'trending', 'categoryId', 'discount'];
    const updateData = {};

    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updateData[key] = updates[key];
      }
    });

    await Product.update(updateData, {
      where: {
        id: { [Op.in]: productIds }
      }
    });

    // Clear cache
    await redis.del('products:*');

    logger.info(`Bulk update applied to ${productIds.length} products`);

    res.json({
      success: true,
      message: `${productIds.length} products updated successfully`
    });
  } catch (error) {
    logger.error('Bulk update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update products',
      error: error.message
    });
  }
};

/**
 * Bulk delete products
 */
const bulkDeleteProducts = async (req, res) => {
  try {
    const { productIds } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Product IDs array is required'
      });
    }

    // Get products with images
    const products = await Product.findAll({
      where: { id: { [Op.in]: productIds } }
    });

    // Delete all images
    for (const product of products) {
      if (product.images && product.images.length > 0) {
        const publicIds = product.images.map(img => img.publicId).filter(Boolean);
        if (publicIds.length > 0) {
          await uploadService.deleteMultipleImages(publicIds);
        }
      }
    }

    // Soft delete products
    await Product.update(
      { isActive: false },
      { where: { id: { [Op.in]: productIds } } }
    );

    // Clear cache
    await redis.del('products:*');

    logger.info(`Bulk delete applied to ${productIds.length} products`);

    res.json({
      success: true,
      message: `${productIds.length} products deleted successfully`
    });
  } catch (error) {
    logger.error('Bulk delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete products',
      error: error.message
    });
  }
};

/**
 * Get product analytics
 */
const getProductAnalytics = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id, {
      include: [{
        model: Category,
        as: 'category'
      }]
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Get sales data
    const salesData = await OrderItem.findAll({
      where: { productId: id },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('SUM', sequelize.col('quantity')), 'quantity'],
        [sequelize.fn('SUM', sequelize.literal('quantity * price')), 'revenue']
      ],
      group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
      order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']],
      raw: true,
      limit: 30
    });

    // Total sales
    const totalSales = await OrderItem.sum('quantity', {
      where: { productId: id }
    });

    // Total revenue
    const totalRevenue = await OrderItem.sum(
      sequelize.literal('quantity * price'),
      { where: { productId: id } }
    );

    res.json({
      success: true,
      data: {
        product,
        analytics: {
          totalSales: totalSales || 0,
          totalRevenue: totalRevenue || 0,
          views: product.views,
          averageRating: product.averageRating,
          reviewCount: product.reviewCount,
          stockStatus: product.getStockStatus(),
          salesData
        }
      }
    });
  } catch (error) {
    logger.error('Get product analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message
    });
  }
};

/**
 * Get low stock products
 */
const getLowStockProducts = async (req, res) => {
  try {
    const products = await Product.findAll({
      where: {
        stockQuantity: {
          [Op.gt]: 0,
          [Op.lte]: sequelize.col('lowStockThreshold')
        },
        isActive: true
      },
      include: [{
        model: Category,
        as: 'category',
        attributes: ['id', 'name']
      }],
      order: [['stockQuantity', 'ASC']]
    });

    res.json({
      success: true,
      data: {
        count: products.length,
        products
      }
    });
  } catch (error) {
    logger.error('Get low stock products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch low stock products',
      error: error.message
    });
  }
};

module.exports = {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProductImage,
  bulkUpdateProducts,
  bulkDeleteProducts,
  getProductAnalytics,
  getLowStockProducts
};