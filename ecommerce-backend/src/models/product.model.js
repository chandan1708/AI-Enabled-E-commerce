const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const elasticsearchService = require('../services/elasticsearch/elasticsearch.service');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.TEXT
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  discountPrice: {
    type: DataTypes.DECIMAL(10, 2),
    validate: {
      min: 0
    }
  },
  stockQuantity: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  categoryId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'categories',
      key: 'id'
    }
  },
  images: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  attributes: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  sku: {
    type: DataTypes.STRING,
    unique: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  views: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  brand: {
    type: DataTypes.STRING
  },
  weight: {
    type: DataTypes.DECIMAL(10, 2),
    comment: 'Weight in kg'
  },
  dimensions: {
    type: DataTypes.JSONB,
    comment: 'length, width, height in cm'
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  trending: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  averageRating: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0
  },
  reviewCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  soldCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lowStockThreshold: {
    type: DataTypes.INTEGER,
    defaultValue: 10
  },
}, {
  tableName: 'products',
  timestamps: true,
  indexes: [
    { fields: ['categoryId'] },
    { fields: ['price'] },
    { fields: ['isActive'] }
  ]
});

// Add a virtual field for stock status
Product.prototype.getStockStatus = function() {
  if (this.stockQuantity === 0) return 'out_of_stock';
  if (this.stockQuantity <= this.lowStockThreshold) return 'low_stock';
  return 'in_stock';
};

// Add hooks at the end before module.exports
Product.addHook('afterCreate', async (product) => {
  try {
    // Fetch with category for complete data
    const fullProduct = await Product.findByPk(product.id, {
      include: [{ model: Category, as: 'category' }]
    });
    await elasticsearchService.indexProduct(fullProduct);
  } catch (error) {
    console.error('ES afterCreate hook error:', error);
  }
});

Product.addHook('afterUpdate', async (product) => {
  try {
    const fullProduct = await Product.findByPk(product.id, {
      include: [{ model: Category, as: 'category' }]
    });
    await elasticsearchService.updateProduct(product.id, 
      elasticsearchService.prepareProductDocument(fullProduct)
    );
  } catch (error) {
    console.error('ES afterUpdate hook error:', error);
  }
});

Product.addHook('afterDestroy', async (product) => {
  try {
    await elasticsearchService.deleteProduct(product.id);
  } catch (error) {
    console.error('ES afterDestroy hook error:', error);
  }
});

module.exports = Product;