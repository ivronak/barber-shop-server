const { Model } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  class ShopClosure extends Model {
    static associate(models) {
      // No associations
    }
  }
  
  ShopClosure.init({
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    is_full_day: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    start_time: {
      type: DataTypes.TIME,
      allowNull: true
    },
    end_time: {
      type: DataTypes.TIME,
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
    modelName: 'ShopClosure',
    tableName: 'shop_closures',
    timestamps: true,
    underscored: true
  });
  
  return ShopClosure;
}; 