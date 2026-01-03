const { Category, Product } = require('../../models');
const { Op } = require('sequelize');
const logger = require('../../utils/logger');

/**
 * Get all categories with product count
 */
const getAllCategories = async (req, res) => {
  try {
    const { includeInactive } = req.query;

    const where = {};
    if (!includeInactive) {
      where.isActive = true;
    }

    const categories = await Category.findAll({
      where,
      include: [
        {
          model: Category,
          as: 'subcategories',
          include: [{
            model: Product,
            as: 'products',
            attributes: []
          }],
          attributes: {
            include: [
              [sequelize.fn('COUNT', sequelize.col('subcategories.products.id')), 'productCount']
            ]
          }
        },
        {
          model: Product,
          as: 'products',
          attributes: []
        }
      ],
      attributes: {
        include: [
          [sequelize.fn('COUNT', sequelize.col('products.id')), 'productCount']
        ]
      },
      group: ['Category.id', 'subcategories.id'],
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    logger.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
};

/**
 * Create category
 */
const createCategory = async (req, res) => {
  try {
    const { name, description, parentId } = req.body;

    // Generate slug
    const slug = name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');

    // Check if slug exists
    const existingCategory = await Category.findOne({ where: { slug } });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }

    // If parentId provided, verify it exists
    if (parentId) {
      const parentCategory = await Category.findByPk(parentId);
      if (!parentCategory) {
        return res.status(404).json({
          success: false,
          message: 'Parent category not found'
        });
      }
    }

    const category = await Category.create({
      name,
      slug,
      description,
      parentId
    });

    logger.info(`Category created: ${category.id}`);

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category
    });
  } catch (error) {
    logger.error('Create category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create category',
      error: error.message
    });
  }
};

/**
 * Update category
 */
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const category = await Category.findByPk(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Update slug if name changed
    if (updateData.name && updateData.name !== category.name) {
      updateData.slug = updateData.name
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');
    }

    await category.update(updateData);

    logger.info(`Category updated: ${category.id}`);

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: category
    });
  } catch (error) {
    logger.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update category',
      error: error.message
    });
  }
};

/**
 * Delete category
 */
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByPk(id, {
      include: [
        { model: Category, as: 'subcategories' },
        { model: Product, as: 'products' }
      ]
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if category has products
    if (category.products && category.products.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with products. Move or delete products first.'
      });
    }

    // Check if category has subcategories
    if (category.subcategories && category.subcategories.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with subcategories. Delete subcategories first.'
      });
    }

    await category.destroy();

    logger.info(`Category deleted: ${id}`);

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    logger.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete category',
      error: error.message
    });
  }
};

module.exports = {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory
};