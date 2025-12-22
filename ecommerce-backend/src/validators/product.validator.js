const Joi = require('joi');

const createProductSchema = Joi.object({
  name: Joi.string().min(3).max(200).required(),
  description: Joi.string().max(5000).optional(),
  price: Joi.number().positive().required(),
  discountPrice: Joi.number().positive().less(Joi.ref('price')).optional(),
  stockQuantity: Joi.number().integer().min(0).required(),
  categoryId: Joi.string().uuid().required(),
  images: Joi.array().items(Joi.string().uri()).optional(),
  attributes: Joi.object().optional(),
  sku: Joi.string().optional()
});

const updateProductSchema = Joi.object({
  name: Joi.string().min(3).max(200).optional(),
  description: Joi.string().max(5000).optional(),
  price: Joi.number().positive().optional(),
  discountPrice: Joi.number().positive().optional(),
  stockQuantity: Joi.number().integer().min(0).optional(),
  categoryId: Joi.string().uuid().optional(),
  images: Joi.array().items(Joi.string().uri()).optional(),
  attributes: Joi.object().optional(),
  sku: Joi.string().optional(),
  isActive: Joi.boolean().optional()
});

module.exports = {
  createProductSchema,
  updateProductSchema
};