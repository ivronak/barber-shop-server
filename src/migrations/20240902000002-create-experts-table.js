'use strict';
const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('experts', {
      id: { type: Sequelize.STRING(36), primaryKey: true, defaultValue: () => uuidv4() },
      name: { type: Sequelize.STRING(100), allowNull: false },
      position: { type: Sequelize.STRING(100), allowNull: true },
      bio: { type: Sequelize.TEXT, allowNull: true },
      image: { type: Sequelize.TEXT('long'), allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'), onUpdate: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },
  async down(queryInterface) { await queryInterface.dropTable('experts'); }
}; 