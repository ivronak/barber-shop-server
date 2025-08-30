const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BusinessHour extends Model {
    static associate(models) {
      // Add association with breaks
      BusinessHour.hasMany(models.Break, {
        foreignKey: 'business_hour_id',
        as: 'breaks'
      });
    }
  }
  
  BusinessHour.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    day_of_week: {
      type: DataTypes.ENUM('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'),
      allowNull: false,
      unique: true
    },
    open_time: {
      type: DataTypes.TIME,
      allowNull: true
    },
    close_time: {
      type: DataTypes.TIME,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'BusinessHour',
    tableName: 'business_hours',
    timestamps: false,
    underscored: true
  });
  
  return BusinessHour;
}; 