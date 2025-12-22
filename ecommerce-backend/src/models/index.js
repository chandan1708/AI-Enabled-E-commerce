const User = require('./user.model');
const Category = require('./category.model');
const Product = require('./product.model');
const Cart = require('./cart.model');
const Order = require('./order.model');
const OrderItem = require('./orderItem.model');
const Wishlist = require('./wishlist.model');

// User associations
User.hasMany(Cart, { foreignKey: 'userId', as: 'cart' });
User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });
User.hasMany(Wishlist, { foreignKey: 'userId', as: 'wishlist' });

// Category associations
Category.hasMany(Product, { foreignKey: 'categoryId', as: 'products' });

// Product associations
Product.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });
Product.hasMany(Cart, { foreignKey: 'productId', as: 'cartItems' });
Product.hasMany(OrderItem, { foreignKey: 'productId', as: 'orderItems' });
Product.hasMany(Wishlist, { foreignKey: 'productId', as: 'wishlists' });

// Cart associations
Cart.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Cart.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

// Order associations
Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items' });

// OrderItem associations
OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
OrderItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

// Wishlist associations
Wishlist.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Wishlist.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

module.exports = {
  User,
  Category,
  Product,
  Cart,
  Order,
  OrderItem,
  Wishlist
};