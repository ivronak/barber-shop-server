'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // ----- invoice_services -----
    await queryInterface.addColumn('invoice_services', 'staff_id', {
      type: Sequelize.STRING(36),
      allowNull: true,
      references: {
        model: 'staff',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    await queryInterface.addColumn('invoice_services', 'staff_name', {
      type: Sequelize.STRING(100),
      allowNull: true
    });
    await queryInterface.addIndex('invoice_services', ['invoice_id', 'staff_id']);

    // ----- invoice_products -----
    await queryInterface.addColumn('invoice_products', 'staff_id', {
      type: Sequelize.STRING(36),
      allowNull: true,
      references: {
        model: 'staff',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    await queryInterface.addColumn('invoice_products', 'staff_name', {
      type: Sequelize.STRING(100),
      allowNull: true
    });
    await queryInterface.addIndex('invoice_products', ['invoice_id', 'staff_id']);

    // ----- invoices (make nullable) -----
    await queryInterface.changeColumn('invoices', 'staff_id', {
      type: Sequelize.STRING(36),
      allowNull: true
    });
    await queryInterface.changeColumn('invoices', 'staff_name', {
      type: Sequelize.STRING(100),
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    // revert invoices table
    await queryInterface.changeColumn('invoices', 'staff_id', {
      type: Sequelize.STRING(36),
      allowNull: false
    });
    await queryInterface.changeColumn('invoices', 'staff_name', {
      type: Sequelize.STRING(100),
      allowNull: false
    });

    // invoice_services cleanup
    await queryInterface.removeIndex('invoice_services', ['invoice_id', 'staff_id']);
    await queryInterface.removeColumn('invoice_services', 'staff_id');
    await queryInterface.removeColumn('invoice_services', 'staff_name');

    // invoice_products cleanup
    await queryInterface.removeIndex('invoice_products', ['invoice_id', 'staff_id']);
    await queryInterface.removeColumn('invoice_products', 'staff_id');
    await queryInterface.removeColumn('invoice_products', 'staff_name');
  }
}; 