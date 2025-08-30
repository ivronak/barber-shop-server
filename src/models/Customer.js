const { Model } = require('sequelize');
const uuid = require('uuid');

module.exports = (sequelize, DataTypes) => {
  class Customer extends Model {
    static associate(models) {
      // Customer has many appointments
      Customer.hasMany(models.Appointment, {
        foreignKey: 'customer_id',
        as: 'appointments'
      });
      
      // Customer has many invoices
      Customer.hasMany(models.Invoice, {
        foreignKey: 'customer_id',
        as: 'invoices'
      });
      
      // Customer has many reviews
      Customer.hasMany(models.Review, {
        foreignKey: 'customer_id',
        as: 'reviews'
      });
    }
  }
  
  Customer.init({
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
    email: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    visit_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    total_spent: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00
    },
    last_visit: {
      type: DataTypes.DATEONLY,
      allowNull: true
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
    modelName: 'Customer',
    tableName: 'customers',
    timestamps: true,
    underscored: true
  });
  
  return Customer;
}; 