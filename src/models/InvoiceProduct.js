const { Model } = require('sequelize');
const uuid = require('uuid');

module.exports = (sequelize, DataTypes) => {
  class InvoiceProduct extends Model {
    static associate(models) {
      // InvoiceProduct belongs to an Invoice
      InvoiceProduct.belongsTo(models.Invoice, {
        foreignKey: 'invoice_id',
        as: 'invoice'
      });

      // InvoiceProduct belongs to a Product
      InvoiceProduct.belongsTo(models.Product, {
        foreignKey: 'product_id',
        as: 'product'
      });
      // InvoiceProduct belongs to a Staff (multi-staff invoices)
      InvoiceProduct.belongsTo(models.Staff, {
        foreignKey: 'staff_id',
        as: 'staff'
      });
    }
  }

  InvoiceProduct.init({
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: () => uuid.v4()
    },
    invoice_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      references: {
        model: 'invoices',
        key: 'id'
      }
    },
    product_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      references: {
        model: 'products',
        key: 'id'
      }
    },
    staff_id: {
      type: DataTypes.STRING(36),
      allowNull: true,
      references: {
        model: 'staff',
        key: 'id'
      }
    },
    staff_name: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    product_name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    commission_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0
    },
    commission_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    }
  }, {
    sequelize,
    modelName: 'InvoiceProduct',
    tableName: 'invoice_products',
    timestamps: false,
    underscored: true,
    hooks: {
      // Before create: fill missing product details and totals
      beforeCreate: async (invoiceProduct) => {
        if (!invoiceProduct.product_name) {
          const product = await sequelize.models.Product.findByPk(invoiceProduct.product_id);
          if (product) {
            invoiceProduct.product_name = product.name;
            if (!invoiceProduct.price) {
              invoiceProduct.price = product.price;
            }
          }
        }

        if (!invoiceProduct.total) {
          invoiceProduct.total = invoiceProduct.price * invoiceProduct.quantity;
        }

        // Ensure commission fields
        if (!invoiceProduct.commission_rate) {
          const product = await sequelize.models.Product.findByPk(invoiceProduct.product_id);
          if (product) {
            invoiceProduct.commission_rate = product.commission || 0;
          }
        }

        invoiceProduct.commission_amount = (invoiceProduct.total || 0) * (invoiceProduct.commission_rate || 0) / 100;
      }
    }
  });

  return InvoiceProduct;
}; 