'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('service_categories', {
      id: {
        type: Sequelize.STRING(36),
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Optionally, add category_id to services table for future use
    // await queryInterface.addColumn('services', 'category_id', {
    //   type: Sequelize.STRING(36),
    //   allowNull: true,
    //   references: {
    //     model: 'service_categories',
    //     key: 'id',
    //   },
    //   onUpdate: 'CASCADE',
    //   onDelete: 'SET NULL',
    // });
  },

  down: async (queryInterface) => {
    // await queryInterface.removeColumn('services', 'category_id');
    await queryInterface.dropTable('service_categories');
  },
}; 