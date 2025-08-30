'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add soft-delete fields to services table
    await queryInterface.addColumn('services', 'is_deleted', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });
    await queryInterface.addColumn('services', 'deleted_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // Add soft-delete fields to service_categories table
    await queryInterface.addColumn('service_categories', 'is_deleted', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });
    await queryInterface.addColumn('service_categories', 'deleted_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('services', 'is_deleted');
    await queryInterface.removeColumn('services', 'deleted_at');
    await queryInterface.removeColumn('service_categories', 'is_deleted');
    await queryInterface.removeColumn('service_categories', 'deleted_at');
  },
}; 