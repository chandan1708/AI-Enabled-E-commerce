const Joi = require('joi');

const createCategorySchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().max(500).optional(),
  parentId: Joi.string().uuid().optional().allow(null)
});

const updateUserRoleSchema = Joi.object({
  role: Joi.string().valid('customer', 'admin').required()
});

const bulkUpdateProductsSchema = Joi.object({
  productIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
  updates: Joi.object({
    isActive: Joi.boolean().optional(),
    featured: Joi.boolean().optional(),
    trending: Joi.boolean().optional(),
    categoryId: Joi.string().uuid().optional(),
    discount: Joi.number().min(0).max(100).optional()
  }).min(1).required()
});

module.exports = {
  createCategorySchema,
  updateUserRoleSchema,
  bulkUpdateProductsSchema
};