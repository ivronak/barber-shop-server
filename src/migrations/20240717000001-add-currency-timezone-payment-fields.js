'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('business_settings', 'currency', {
      type: Sequelize.STRING(10),
      allowNull: false,
      defaultValue: 'USD'
    });

    await queryInterface.addColumn('business_settings', 'timezone', {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: 'UTC'
    });

    await queryInterface.addColumn('business_settings', 'accept_cash', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });

    await queryInterface.addColumn('business_settings', 'accept_card', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });

    await queryInterface.addColumn('business_settings', 'accept_mobile', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('business_settings', 'currency');
    await queryInterface.removeColumn('business_settings', 'timezone');
    await queryInterface.removeColumn('business_settings', 'accept_cash');
    await queryInterface.removeColumn('business_settings', 'accept_card');
    await queryInterface.removeColumn('business_settings', 'accept_mobile');
  }
}; 