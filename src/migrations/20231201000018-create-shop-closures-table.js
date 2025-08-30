'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('shop_closures', {
      id: {
        type: Sequelize.STRING(36),
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      is_full_day: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      start_time: {
        type: Sequelize.TIME,
        allowNull: true
      },
      end_time: {
        type: Sequelize.TIME,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('shop_closures');
  }
}; 