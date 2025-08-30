'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('invoices', {
      id: {
        type: Sequelize.STRING(36),
        primaryKey: true,
        allowNull: false
      },
      appointment_id: {
        type: Sequelize.STRING(36),
        references: {
          model: 'appointments',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      customer_id: {
        type: Sequelize.STRING(36),
        allowNull: false,
        references: {
          model: 'customers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      staff_id: {
        type: Sequelize.STRING(36),
        allowNull: false,
        references: {
          model: 'staff',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      customer_name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      staff_name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      subtotal: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      discount_type: {
        type: Sequelize.ENUM('percentage', 'fixed'),
        allowNull: true
      },
      discount_value: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      discount_amount: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0.00
      },
      tip_amount: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0.00
      },
      tax: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false
      },
      tax_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      total: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      payment_method: {
        type: Sequelize.ENUM('cash', 'card', 'mobile', 'pending'),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('paid', 'pending', 'cancelled'),
        allowNull: false
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('invoices');
  }
}; 