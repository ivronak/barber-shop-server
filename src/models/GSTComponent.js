const { Model } = require('sequelize');
const uuid = require('uuid');

module.exports = (sequelize, DataTypes) => {
  class GSTComponent extends Model {
    static associate(models) {
      // GSTComponent belongs to a GSTRate
      GSTComponent.belongsTo(models.GSTRate, {
        foreignKey: 'gst_rate_id',
        as: 'gstRate'
      });
    }
  }
  
  GSTComponent.init({
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: () => uuid.v4()
    },
    gst_rate_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      references: {
        model: 'gst_rates',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'GSTComponent',
    tableName: 'gst_components',
    timestamps: false,
    underscored: true
  });
  
  return GSTComponent;
}; 