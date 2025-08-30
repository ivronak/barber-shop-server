const { Model } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  class ActivityLog extends Model {
    static associate(models) {
      // ActivityLog belongs to a User
      ActivityLog.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
    }
  }
  
  ActivityLog.init({
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: () => uuidv4()
    },
    user_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    user_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    user_role: {
      type: DataTypes.ENUM('admin', 'staff', 'billing'),
      allowNull: false
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    details: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'ActivityLog',
    tableName: 'activity_logs',
    timestamps: false,
    underscored: true
  });
  
  return ActivityLog;
}; 