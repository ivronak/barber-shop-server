'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // First add the columns without foreign key constraints
    await queryInterface.addColumn('breaks', 'staff_id', {
      type: Sequelize.UUID,
      allowNull: true
    });

    await queryInterface.addColumn('breaks', 'day_of_week', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: '0 = Sunday, 1 = Monday, etc.'
    });

    // Make business_hour_id nullable
    await queryInterface.changeColumn('breaks', 'business_hour_id', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('breaks', 'staff_id');
    await queryInterface.removeColumn('breaks', 'day_of_week');
    
    // Revert business_hour_id to non-nullable
    await queryInterface.changeColumn('breaks', 'business_hour_id', {
      type: Sequelize.INTEGER,
      allowNull: false
    });
  }
}; 