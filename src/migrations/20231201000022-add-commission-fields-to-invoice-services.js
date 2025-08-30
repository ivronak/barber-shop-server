'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await Promise.all([
      queryInterface.addColumn('invoice_services', 'commission_rate', {
        type: Sequelize.DECIMAL(5,2),
        allowNull: false,
        defaultValue: 0
      }),
      queryInterface.addColumn('invoice_services', 'commission_amount', {
        type: Sequelize.DECIMAL(10,2),
        allowNull: false,
        defaultValue: 0
      })
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await Promise.all([
      queryInterface.removeColumn('invoice_services', 'commission_rate'),
      queryInterface.removeColumn('invoice_services', 'commission_amount')
    ]);
  }
}; 