const { Model } = require('sequelize');
const uuid = require('uuid');

module.exports = (sequelize, DataTypes) => {
  class Staff extends Model {
    static associate(models) {
      // Staff belongs to a User
      Staff.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
      
      // Staff has many working hours
      Staff.hasMany(models.WorkingHour, {
        foreignKey: 'staff_id',
        as: 'workingHours'
      });
      
      // Staff has many breaks
      Staff.hasMany(models.Break, {
        foreignKey: 'staff_id',
        as: 'breaks'
      });
      
      // Staff has many staff services (many-to-many with services)
      Staff.belongsToMany(models.Service, {
        through: 'staff_services',
        foreignKey: 'staff_id',
        otherKey: 'service_id',
        as: 'services'
      });
      
      // Staff has many appointments
      Staff.hasMany(models.Appointment, {
        foreignKey: 'staff_id',
        as: 'appointments'
      });
      
      // Staff has many invoices
      Staff.hasMany(models.Invoice, {
        foreignKey: 'staff_id',
        as: 'invoices'
      });
      
      // Staff has many reviews
      Staff.hasMany(models.Review, {
        foreignKey: 'staff_id',
        as: 'reviews'
      });
    }
  }
  
  Staff.init({
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: () => uuid.v4()
    },
    user_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    commission_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    is_available: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
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
    modelName: 'Staff',
    tableName: 'staff',
    timestamps: true,
    underscored: true
  });
  
  return Staff;
}; 