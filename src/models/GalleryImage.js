const { Model } = require('sequelize');
const uuid = require('uuid');

module.exports = (sequelize, DataTypes) => {
  class GalleryImage extends Model {
    static associate(models) {
      // No associations
    }
  }
  
  GalleryImage.init({
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: () => uuid.v4()
    },
    title: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    url: {
      type: DataTypes.TEXT('long'),
      allowNull: false
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    display_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    is_active: {
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
    modelName: 'GalleryImage',
    tableName: 'gallery_images',
    timestamps: true,
    underscored: true
  });
  
  return GalleryImage;
}; 