const { Model } = require('sequelize');
const uuid = require('uuid');
const { generateInvoiceId } = require('../utils/generateId');

module.exports = (sequelize, DataTypes) => {
  class Invoice extends Model {
    static associate(models) {
      // Invoice belongs to an Appointment (optional)
      Invoice.belongsTo(models.Appointment, {
        foreignKey: 'appointment_id',
        as: 'appointment'
      });
      
      // Invoice belongs to a Customer
      Invoice.belongsTo(models.Customer, {
        foreignKey: 'customer_id',
        as: 'customer'
      });
      
      // Invoice has many invoice services
      Invoice.hasMany(models.InvoiceService, {
        foreignKey: 'invoice_id',
        as: 'invoiceServices'
      });
      
      // Invoice has many invoice products
      Invoice.hasMany(models.InvoiceProduct, {
        foreignKey: 'invoice_id',
        as: 'invoiceProducts'
      });
      
      // Invoice has many tax components
      Invoice.hasMany(models.TaxComponent, {
        foreignKey: 'invoice_id',
        as: 'taxComponents'
      });
    }
  }
  
  Invoice.init({
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: () => generateInvoiceId()
    },
    appointment_id: {
      type: DataTypes.STRING(36),
      allowNull: true,
      references: {
        model: 'appointments',
        key: 'id'
      }
    },
    customer_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      references: {
        model: 'customers',
        key: 'id'
      }
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    customer_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    discount_type: {
      type: DataTypes.ENUM('percentage', 'fixed'),
      allowNull: true
    },
    discount_value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    discount_amount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00
    },
    // tip_amount removed; tips now live on invoice_services
    tax: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false
    },
    tax_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    payment_method: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'pending'
    },
    status: {
      type: DataTypes.ENUM('paid', 'pending', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'Invoice',
    tableName: 'invoices',
    timestamps: true,
    underscored: true,
    hooks: {
      // Before creating invoice, duplicate customer name for historical record
      beforeCreate: async (invoice, options) => {
        if (!invoice.customer_name) {
          const customer = await sequelize.models.Customer.findByPk(invoice.customer_id);
          if (customer) {
            invoice.customer_name = customer.name;
          }
        }
      }
    }
  });
  
  return Invoice;
}; 