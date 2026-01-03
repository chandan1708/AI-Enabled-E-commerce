const Joi = require('joi');

const shippingAddressSchema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    phone: Joi.string().pattern(/^[0-9]{10}$/).required(),
    addressLine1: Joi.string().min(5).max(200).required(),
    addressLine2: Joi.string().max(200).optional().allow(''),
    city: Joi.string().min(2).max(100).required(),
    state: Joi.string().min(2).max(100).required(),
    pincode: Joi.string().pattern(/^[0-9]{6}$/).required(),
    country: Joi.string().default('India')
});

const createOrderSchema = Joi.object({
    shippingAddress: shippingAddressSchema.required(),
    billingAddress: shippingAddressSchema.optional(),
    paymentMethod: Joi.string().valid('razorpay', 'cod').default('razorpay'),
    notes: Joi.string().max(500).optional()
});

const verifyPaymentSchema = Joi.object({
    razorpayOrderId: Joi.string().required(),
    razorpayPaymentId: Joi.string().required(),
    razorpaySignature: Joi.string().required()
});

const cancelOrderSchema = Joi.object({
    cancelReason: Joi.string().max(500).optional()
});

module.exports = {
    createOrderSchema,
    verifyPaymentSchema,
    cancelOrderSchema
};