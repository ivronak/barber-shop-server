'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('service_categories');
    if (!table.is_active) {
      await queryInterface.addColumn('service_categories', 'is_active', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      });
    }
  },

  down: async (queryInterface) => {
    // No-op: Do not drop column automatically, as it may pre-exist
  },
}; 