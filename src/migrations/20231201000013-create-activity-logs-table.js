'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('activity_logs', {
      id: {
        type: Sequelize.STRING(36),
        primaryKey: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.STRING(36),
        allowNull: false
      },
      user_name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      user_role: {
        type: Sequelize.ENUM('admin', 'staff', 'billing', 'system'),
        allowNull: false
      },
      action: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      details: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      timestamp: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('activity_logs');
  }
}; 