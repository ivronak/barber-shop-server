'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Remove staff_id and staff_name from invoices table as we now track staff per line item.
    await Promise.all([
      queryInterface.removeColumn('invoices', 'staff_id').catch(()=>{}),
      queryInterface.removeColumn('invoices', 'staff_name').catch(()=>{})
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    // Re-add columns in case of rollback.
    await queryInterface.addColumn('invoices', 'staff_id', {
      type: Sequelize.STRING(36),
      allowNull: true,
      references: {
        model: 'staff',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    await queryInterface.addColumn('invoices', 'staff_name', {
      type: Sequelize.STRING(100),
      allowNull: true
    });
  }
};