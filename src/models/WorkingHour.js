const { Model } = require('sequelize');
const uuid = require('uuid');

module.exports = (sequelize, DataTypes) => {
  class WorkingHour extends Model {
    static associate(models) {
      // WorkingHour belongs to a Staff
      WorkingHour.belongsTo(models.Staff, {
        foreignKey: 'staff_id',
        as: 'staff'
      });
    }
  }
  
  WorkingHour.init({
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: () => uuid.v4()
    },
    staff_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      references: {
        model: 'staff',
        key: 'id'
      }
    },
    day_of_week: {
      type: DataTypes.ENUM('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'),
      allowNull: false
    },
    start_time: {
      type: DataTypes.TIME,
      allowNull: false
    },
    end_time: {
      type: DataTypes.TIME,
      allowNull: false
    },
    is_break: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    sequelize,
    modelName: 'WorkingHour',
    tableName: 'working_hours',
    timestamps: false,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['staff_id', 'day_of_week', 'start_time']
      }
    ]
  });
  
  return WorkingHour;
}; 