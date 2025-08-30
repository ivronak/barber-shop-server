'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('service_categories', 'image_url', {
      type: Sequelize.TEXT('long'),
      allowNull: true,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('service_categories', 'image_url');
  },
}; 