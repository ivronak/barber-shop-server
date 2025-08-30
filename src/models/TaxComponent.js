const { Model } = require('sequelize');
const uuid = require('uuid');

module.exports = (sequelize, DataTypes) => {
  class TaxComponent extends Model {
    static associate(models) {
      // TaxComponent belongs to an Invoice
      TaxComponent.belongsTo(models.Invoice, {
        foreignKey: 'invoice_id',
        as: 'invoice'
      });
    }
  }
  
  TaxComponent.init({
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
    name: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'TaxComponent',
    tableName: 'tax_components',
    timestamps: false,
    underscored: true
  });
  
  return TaxComponent;
}; 