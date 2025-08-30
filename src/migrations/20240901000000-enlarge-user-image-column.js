'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Change the image column to LONGTEXT so it can store large base64 strings
    await queryInterface.changeColumn('users', 'image', {
      type: Sequelize.TEXT('long'),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    // Revert back to STRING(255) if needed
    await queryInterface.changeColumn('users', 'image', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
  },
}; 