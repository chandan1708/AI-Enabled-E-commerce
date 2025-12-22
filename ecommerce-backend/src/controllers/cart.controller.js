const { Cart, Product } = require('../models');
const logger = require('../utils/logger');

const getCart = async (req, res) => {
  try {
    const userId = req.user.userId;

    const cartItems = await Cart.findAll({
      where: { userId },
      include: [{
        model: Product,
        as: 'product',
        attributes: ['id', 'name', 'price', 'discountPrice', 'images', 'stockQuantity']
      }]
    });

    // Calculate total
    const total = cartItems.reduce((sum, item) => {
      const price = item.product.discountPrice || item.product.price;
      return sum + (parseFloat(price) * item.quantity);
    }, 0);

    res.json({
      success: true,
      data: {
        items: cartItems,
        total: total.toFixed(2),
        count: cartItems.length
      }
    });
  } catch (error) {
    logger.error('Get cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

const addToCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId, quantity = 1 } = req.body;

    // Check if product exists and has stock
    const product = await Product.findByPk(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (product.stockQuantity < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient stock'
      });
    }

    // Check if item already in cart
    let cartItem = await Cart.findOne({
      where: { userId, productId }
    });

    if (cartItem) {
      // Update quantity
      cartItem.quantity += quantity;

      if (cartItem.quantity > product.stockQuantity) {
        return res.status(400).json({
          success: false,
          message: 'Quantity exceeds available stock'
        });
      }

      await cartItem.save();
    } else {
      // Create new cart item
      cartItem = await Cart.create({
        userId,
        productId,
        quantity
      });
    }

    // Fetch updated cart item with product details
    const updatedItem = await Cart.findByPk(cartItem.id, {
      include: [{
        model: Product,
        as: 'product',
        attributes: ['id', 'name', 'price', 'discountPrice', 'images']
      }]
    });

    res.json({
      success: true,
      message: 'Product added to cart',
      data: updatedItem
    });
  } catch (error) {
    logger.error('Add to cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

const updateCartItem = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { quantity } = req.body;

    const cartItem = await Cart.findOne({
      where: { id, userId },
      include: [{ model: Product, as: 'product' }]
    });

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found'
      });
    }

    if (quantity > cartItem.product.stockQuantity) {
      return res.status(400).json({
        success: false,
        message: 'Quantity exceeds available stock'
      });
    }

    cartItem.quantity = quantity;
    await cartItem.save();

    res.json({
      success: true,
      message: 'Cart updated',
      data: cartItem
    });
  } catch (error) {
    logger.error('Update cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

const removeFromCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const cartItem = await Cart.findOne({
      where: { id, userId }
    });

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found'
      });
    }

    await cartItem.destroy();

    res.json({
      success: true,
      message: 'Item removed from cart'
    });
  } catch (error) {
    logger.error('Remove from cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

const clearCart = async (req, res) => {
  try {
    const userId = req.user.userId;

    await Cart.destroy({
      where: { userId }
    });

    res.json({
      success: true,
      message: 'Cart cleared'
    });
  } catch (error) {
    logger.error('Clear cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
};