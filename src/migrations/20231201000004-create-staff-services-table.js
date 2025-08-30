'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('staff_services', {
      staff_id: {
        type: Sequelize.STRING(36),
        allowNull: false,
        references: {
          model: 'staff',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      service_id: {
        type: Sequelize.STRING(36),
        allowNull: false,
        references: {
          model: 'services',
          key: 'id'
        },
        onDelete: 'CASCADE'
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

    // Add primary key constraint
    await queryInterface.addConstraint('staff_services', {
      fields: ['staff_id', 'service_id'],
      type: 'primary key',
      name: 'staff_services_pkey'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('staff_services');
  }
}; 