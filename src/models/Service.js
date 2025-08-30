const { Model } = require('sequelize');
const uuid = require('uuid');

module.exports = (sequelize, DataTypes) => {
  class Service extends Model {
    static associate(models) {
      // Service has many staff services (many-to-many with staff)
      Service.belongsToMany(models.Staff, {
        through: 'staff_services',
        foreignKey: 'service_id',
        otherKey: 'staff_id',
        as: 'staff'
      });
      
      // Service has many appointment services
      Service.hasMany(models.AppointmentService, {
        foreignKey: 'service_id',
        as: 'appointmentServices'
      });
      
      // Service has many invoice services
      Service.hasMany(models.InvoiceService, {
        foreignKey: 'service_id',
        as: 'invoiceServices'
      });

      // Service belongs to a category
      Service.belongsTo(models.ServiceCategory, {
        foreignKey: 'category_id',
        as: 'serviceCategory'
      });
    }
  }
  
  Service.init({
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: () => uuid.v4()
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 5
      },
      comment: 'Duration in minutes'
    },
    category_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    imageUrl: {
      // Allow large base64 data URLs or external URLs like we do for product images
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    // Virtual category name for backward compatibility
    category: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.get('serviceCategory') ? this.get('serviceCategory').name : null;
      },
      set(_value) {
        throw new Error('category is a virtual field and cannot be set');
      },
    },
    // Soft-delete flag
    is_deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
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
    modelName: 'Service',
    tableName: 'services',
    timestamps: true,
    underscored: true,
    defaultScope: {
      where: { is_deleted: false },
    },
    scopes: {
      withDeleted: {},
      active: { where: { is_active: true, is_deleted: false } },
    },
  });
  
  return Service;
}; 