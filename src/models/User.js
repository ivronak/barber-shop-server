const { Model } = require('sequelize');
const bcrypt = require('bcryptjs');
const uuid = require('uuid');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // User has one Staff profile
      User.hasOne(models.Staff, {
        foreignKey: 'user_id',
        as: 'staff'
      });
      
      // User has many activity logs
      User.hasMany(models.ActivityLog, {
        foreignKey: 'user_id',
        as: 'activityLogs'
      });
    }
    
    // Instance method to check if password matches
    async checkPassword(password) {
      return await bcrypt.compare(password, this.password);
    }
  }
  
  User.init({
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
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        len: [6, 100]
      }
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    role: {
      type: DataTypes.ENUM('admin', 'staff', 'billing'),
      allowNull: false,
      defaultValue: 'staff'
    },
    image: {
      type: DataTypes.TEXT('long'),
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
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    underscored: true,
    hooks: {
      // Hash password before saving
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      }
    }
  });
  
  return User;
}; 