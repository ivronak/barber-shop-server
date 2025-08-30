'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('gst_components', {
      id: {
        type: Sequelize.STRING(36),
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      gst_rate_id: {
        type: Sequelize.STRING(36),
        allowNull: false,
        references: {
          model: 'gst_rates',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      name: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      rate: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('gst_components');
  }
}; 