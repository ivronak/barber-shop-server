const { Model } = require('sequelize');
const uuid = require('uuid');

module.exports = (sequelize, DataTypes) => {
  class GSTRate extends Model {
    static associate(models) {
      // GSTRate has many GSTComponents
      GSTRate.hasMany(models.GSTComponent, {
        foreignKey: 'gst_rate_id',
        as: 'components'
      });
    }
  }
  
  GSTRate.init({
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: () => uuid.v4()
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    total_rate: {
      type: DataTypes.DECIMAL(5, 2),
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
    modelName: 'GSTRate',
    tableName: 'gst_rates',
    timestamps: true,
    underscored: true
  });
  
  return GSTRate;
}; 