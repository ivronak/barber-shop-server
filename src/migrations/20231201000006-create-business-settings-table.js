'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('business_settings', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      email: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      logo: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      slot_duration: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 30
      },
      tax_rate: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      allow_discounts: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      allow_tips: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      default_commission: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        onUpdate: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Insert default business settings
    await queryInterface.bulkInsert('business_settings', [{
      name: 'The Barber Shop',
      address: '123 Main Street, Anytown, USA',
      phone: '555-123-4567',
      email: 'info@barbershop.com',
      slot_duration: 30,
      tax_rate: 7.00,
      allow_discounts: true,
      allow_tips: true,
      default_commission: 50.00,
      created_at: new Date(),
      updated_at: new Date()
    }], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('business_settings');
  }
}; 