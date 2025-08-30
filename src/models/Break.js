const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Break = sequelize.define('Break', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    business_hour_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'business_hours',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    staff_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'staff',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    day_of_week: {
      type: DataTypes.ENUM('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'),
      allowNull: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    start_time: {
      type: DataTypes.TIME,
      allowNull: false
    },
    end_time: {
      type: DataTypes.TIME,
      allowNull: false
    }
  }, {
    tableName: 'breaks',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  Break.associate = (models) => {
    Break.belongsTo(models.BusinessHour, {
      foreignKey: 'business_hour_id',
      as: 'businessHour'
    });
    
    Break.belongsTo(models.Staff, {
      foreignKey: 'staff_id',
      as: 'staff'
    });
  };

  return Break;
}; 