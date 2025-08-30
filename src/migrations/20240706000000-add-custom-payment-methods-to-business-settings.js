"use strict";

/**
 * Migration: Add custom_payment_methods column to business_settings table.
 * Stores JSON array of additional payment methods.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(
      "business_settings",
      "custom_payment_methods",
      {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: []
      }
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("business_settings", "custom_payment_methods");
  }
}; 