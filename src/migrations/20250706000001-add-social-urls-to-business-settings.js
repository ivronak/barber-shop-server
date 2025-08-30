"use strict";

/**
 * Migration: Add social media URL columns to business_settings table.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add columns one by one for clarity
    await queryInterface.addColumn("business_settings", "facebook_url", {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    await queryInterface.addColumn("business_settings", "instagram_url", {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    await queryInterface.addColumn("business_settings", "twitter_url", {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    await queryInterface.addColumn("business_settings", "youtube_url", {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("business_settings", "facebook_url");
    await queryInterface.removeColumn("business_settings", "instagram_url");
    await queryInterface.removeColumn("business_settings", "twitter_url");
    await queryInterface.removeColumn("business_settings", "youtube_url");
  },
}; 