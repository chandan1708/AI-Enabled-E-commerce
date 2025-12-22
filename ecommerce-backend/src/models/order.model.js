const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  orderNumber: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  discount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  tax: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  shippingCharge: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  finalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM(
      'pending',
      'payment_pending',
      'payment_failed',
      'confirmed',
      'processing',
      'shipped',
      'delivered',
      'cancelled',
      'refunded'
    ),
    defaultValue: 'pending'
  },
  paymentMethod: {
    type: DataTypes.ENUM('razorpay', 'cod'),
    defaultValue: 'razorpay'
  },
  razorpayOrderId: {
    type: DataTypes.STRING
  },
  razorpayPaymentId: {
    type: DataTypes.STRING
  },
  razorpaySignature: {
    type: DataTypes.STRING
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
    defaultValue: 'pending'
  },
  shippingAddress: {
    type: DataTypes.JSONB,
    allowNull: false
    // Structure: { name, phone, addressLine1, addressLine2, city, state, pincode, country }
  },
  billingAddress: {
    type: DataTypes.JSONB
  },
  trackingNumber: {
    type: DataTypes.STRING
  },
  estimatedDelivery: {
    type: DataTypes.DATE
  },
  deliveredAt: {
    type: DataTypes.DATE
  },
  notes: {
    type: DataTypes.TEXT
  },
  cancelReason: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'orders',
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['status'] },
    { fields: ['paymentStatus'] },
    { fields: ['orderNumber'] },
    { fields: ['razorpayOrderId'] },
    { fields: ['createdAt'] }
  ],
  hooks: {
    beforeCreate: async (order) => {
      // Generate unique order number
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000);
      order.orderNumber = `ORD-${timestamp}-${random}`;
    }
  }
});

module.exports = Order;