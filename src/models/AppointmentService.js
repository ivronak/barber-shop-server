const { Model } = require('sequelize');
const uuid = require('uuid');

module.exports = (sequelize, DataTypes) => {
  class AppointmentService extends Model {
    static associate(models) {
      // AppointmentService belongs to an Appointment
      AppointmentService.belongsTo(models.Appointment, {
        foreignKey: 'appointment_id',
        as: 'appointment'
      });
      
      // AppointmentService belongs to a Service
      AppointmentService.belongsTo(models.Service, {
        foreignKey: 'service_id',
        as: 'service'
      });
    }
  }
  
  AppointmentService.init({
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: () => uuid.v4()
    },
    appointment_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      references: {
        model: 'appointments',
        key: 'id'
      }
    },
    service_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      references: {
        model: 'services',
        key: 'id'
      }
    },
    service_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'AppointmentService',
    tableName: 'appointment_services',
    timestamps: false,
    underscored: true,
    hooks: {
      // Before creating appointmentService, duplicate service details for historical record
      beforeCreate: async (appointmentService, options) => {
        if (!appointmentService.service_name) {
          const service = await sequelize.models.Service.findByPk(appointmentService.service_id);
          if (service) {
            appointmentService.service_name = service.name;
            appointmentService.price = service.price;
            appointmentService.duration = service.duration;
          }
        }
      }
    }
  });
  
  return AppointmentService;
}; 