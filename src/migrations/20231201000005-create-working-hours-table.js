'use strict';
const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('working_hours', {
      id: {
        type: Sequelize.STRING(36),
        primaryKey: true,
        defaultValue: () => uuidv4()
      },
      staff_id: {
        type: Sequelize.STRING(36),
        allowNull: false,
        references: {
          model: 'staff',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      day_of_week: {
        type: Sequelize.ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
        allowNull: false
      },
      start_time: {
        type: Sequelize.TIME,
        allowNull: false
      },
      end_time: {
        type: Sequelize.TIME,
        allowNull: false
      },
      is_break: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        onUpdate: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add unique constraint for staff_id, day_of_week, and start_time
    await queryInterface.addConstraint('working_hours', {
      fields: ['staff_id', 'day_of_week', 'start_time'],
      type: 'unique',
      name: 'working_hours_unique'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('working_hours');
  }
}; 