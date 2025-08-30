"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // In MySQL / Postgres, we need to drop the ENUM and change to STRING
    await queryInterface.changeColumn("invoices", "payment_method", {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: "pending",
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert back to ENUM with original values
    await queryInterface.changeColumn("invoices", "payment_method", {
      type: Sequelize.ENUM("cash", "card", "mobile", "pending"),
      allowNull: false,
    });
  }
}; 