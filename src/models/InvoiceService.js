const { Model } = require('sequelize');
const uuid = require('uuid');

module.exports = (sequelize, DataTypes) => {
  class InvoiceService extends Model {
    static associate(models) {
      // InvoiceService belongs to an Invoice
      InvoiceService.belongsTo(models.Invoice, {
        foreignKey: 'invoice_id',
        as: 'invoice'
      });
      
      // InvoiceService belongs to a Service
      InvoiceService.belongsTo(models.Service, {
        foreignKey: 'service_id',
        as: 'service'
      });
      // InvoiceService belongs to a Staff (multi-staff invoices)
      InvoiceService.belongsTo(models.Staff, {
        foreignKey: 'staff_id',
        as: 'staff'
      });
    }
  }
  
  InvoiceService.init({
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
    service_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      references: {
        model: 'services',
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
    service_name: {
      type: DataTypes.STRING(100),
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
    tip_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
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
    modelName: 'InvoiceService',
    tableName: 'invoice_services',
    timestamps: false,
    underscored: true,
    hooks: {
      // Before creating invoiceService, duplicate service details for historical record
      beforeCreate: async (invoiceService, options) => {
        if (!invoiceService.service_name) {
          const service = await sequelize.models.Service.findByPk(invoiceService.service_id);
          if (service) {
            invoiceService.service_name = service.name;
            if (!invoiceService.price) {
              invoiceService.price = service.price;
            }
          }
        }
        
        // Calculate total if not provided
        if (!invoiceService.total) {
          invoiceService.total = invoiceService.price * invoiceService.quantity;
        }

        // Duplicate staff_name if missing
        if (!invoiceService.staff_name && invoiceService.staff_id) {
          try {
            const staffRecord = await sequelize.models.Staff.findByPk(invoiceService.staff_id, {
              include: [{ model: sequelize.models.User, as: 'user' }]
            });
            if (staffRecord && staffRecord.user) {
              invoiceService.staff_name = staffRecord.user.name;
            }
          } catch (_) {/* ignore */}
        }

        // Fill commission based on staff percentage
        if (!invoiceService.commission_rate) {
          try {
            let staffRecord = null;
            if (invoiceService.staff_id) {
              staffRecord = await sequelize.models.Staff.findByPk(invoiceService.staff_id);
            } else {
              // Removed invoice header fallback (invoice.staff_id no longer exists)
            }
            if (staffRecord) {
              invoiceService.commission_rate = staffRecord.commission_percentage || 0;
            }
          } catch (_) {/* ignore */}
        }
        invoiceService.commission_amount = (invoiceService.total || 0) * (invoiceService.commission_rate || 0) / 100;
      }
    }
  });
  
  return InvoiceService;
}; 