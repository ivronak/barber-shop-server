const { Model } = require('sequelize');
const uuid = require('uuid');

module.exports = (sequelize, DataTypes) => {
  class ServiceCategory extends Model {
    static associate(models) {
      // A category can have many services (one-to-many)
      ServiceCategory.hasMany(models.Service, {
        foreignKey: 'category_id',
        as: 'services'
      });
    }
  }

  ServiceCategory.init(
    {
      id: {
        type: DataTypes.STRING(36),
        primaryKey: true,
        defaultValue: () => uuid.v4(),
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: true,
        },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      imageUrl: {
        type: DataTypes.TEXT('long'),
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      // Soft-delete columns
      is_deleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'ServiceCategory',
      tableName: 'service_categories',
      timestamps: true,
      underscored: true,
      defaultScope: {
        where: { is_deleted: false },
      },
      scopes: {
        withDeleted: {},
        active: { where: { is_active: true, is_deleted: false } },
      },
    }
  );

  return ServiceCategory;
}; 