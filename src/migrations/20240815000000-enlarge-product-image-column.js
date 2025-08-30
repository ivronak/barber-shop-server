'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Change the image_url column to LONGTEXT / TEXT('long') so it can store large base64 strings
    await queryInterface.changeColumn('products', 'image_url', {
      type: Sequelize.TEXT('long'),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    // Revert back to STRING(255)
    await queryInterface.changeColumn('products', 'image_url', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
}; 