'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('services', 'category_id', {
      type: Sequelize.STRING(36),
      allowNull: true,
      references: {
        model: 'service_categories',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('services', 'category_id');
  },
}; 