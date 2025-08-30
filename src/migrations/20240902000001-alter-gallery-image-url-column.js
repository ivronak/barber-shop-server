'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('gallery_images', 'url', {
      type: Sequelize.TEXT('long'),
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('gallery_images', 'url', {
      type: Sequelize.STRING(255),
      allowNull: false,
    });
  },
}; 