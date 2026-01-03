const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const InventoryLog = sequelize.define('InventoryLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'products',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM('purchase', 'sale', 'return', 'adjustment', 'damage'),
    allowNull: false
  },
  quantityChange: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Positive for increase, negative for decrease'
  },
  previousQuantity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  newQuantity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  orderId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'orders',
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  notes: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'inventory_logs',
  timestamps: true,
  indexes: [
    { fields: ['productId'] },
    { fields: ['type'] },
    { fields: ['createdAt'] }
  ]
});

module.exports = InventoryLog;