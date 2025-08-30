'use strict';
const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('staff', {
      id: {
        type: Sequelize.STRING(36),
        primaryKey: true,
        defaultValue: () => uuidv4()
      },
      user_id: {
        type: Sequelize.STRING(36),
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      position: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      bio: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      commission_percentage: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false
      },
      is_available: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
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
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('staff');
  }
}; 