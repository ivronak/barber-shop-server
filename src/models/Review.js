const { Model } = require('sequelize');
const uuid = require('uuid');

module.exports = (sequelize, DataTypes) => {
  class Review extends Model {
    static associate(models) {
      // Review belongs to a Customer
      Review.belongsTo(models.Customer, {
        foreignKey: 'customer_id',
        as: 'customer'
      });
      
      // Review belongs to a Staff
      Review.belongsTo(models.Staff, {
        foreignKey: 'staff_id',
        as: 'staff'
      });
    }
  }
  
  Review.init({
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: () => uuid.v4()
    },
    customer_id: {
      type: DataTypes.STRING(36),
      allowNull: true,
      references: {
        model: 'customers',
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
    customer_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    staff_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5
      }
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    is_approved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
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
    modelName: 'Review',
    tableName: 'reviews',
    timestamps: true,
    underscored: true
  });
  
  return Review;
}; 