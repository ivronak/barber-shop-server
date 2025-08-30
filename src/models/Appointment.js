const { Model } = require('sequelize');
const uuid = require('uuid');
const { generateAppointmentId } = require('../utils/generateId');

module.exports = (sequelize, DataTypes) => {
  class Appointment extends Model {
    static associate(models) {
      // Appointment belongs to a Customer
      Appointment.belongsTo(models.Customer, {
        foreignKey: 'customer_id',
        as: 'customer'
      });
      
      // Appointment belongs to a Staff
      Appointment.belongsTo(models.Staff, {
        foreignKey: 'staff_id',
        as: 'staff'
      });
      
      // Appointment has many appointment services
      Appointment.hasMany(models.AppointmentService, {
        foreignKey: 'appointment_id',
        as: 'appointmentServices'
      });
      
      // Appointment has one invoice
      Appointment.hasOne(models.Invoice, {
        foreignKey: 'appointment_id',
        as: 'invoice'
      });
    }
  }
  
  Appointment.init({
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: () => generateAppointmentId()
    },
    customer_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      references: {
        model: 'customers',
        key: 'id'
      }
    },
    staff_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      references: {
        model: 'staff',
        key: 'id'
      }
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    time: {
      type: DataTypes.TIME,
      allowNull: false
    },
    end_time: {
      type: DataTypes.TIME,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('scheduled', 'confirmed', 'completed', 'cancelled', 'no-show'),
      allowNull: false,
      defaultValue: 'scheduled'
    },
    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    customer_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    customer_phone: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    customer_email: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    staff_name: {
      type: DataTypes.STRING(100),
      allowNull: false
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
    modelName: 'Appointment',
    tableName: 'appointments',
    timestamps: true,
    underscored: true,
    hooks: {
      // Before creating appointment, duplicate customer and staff name for historical record
      beforeCreate: async (appointment, options) => {
        if (!appointment.customer_name || !appointment.staff_name) {
          const [customer, staff] = await Promise.all([
            sequelize.models.Customer.findByPk(appointment.customer_id),
            sequelize.models.Staff.findByPk(appointment.staff_id, {
              include: [{ model: sequelize.models.User, as: 'user' }]
            })
          ]);

          if (customer) {
            appointment.customer_name = customer.name;
            appointment.customer_phone = customer.phone;
            appointment.customer_email = customer.email;
          }
          
          if (staff && staff.user) {
            appointment.staff_name = staff.user.name;
          }
        }
      }
    }
  });
  
  return Appointment;
}; 