'use strict';

/**
 * Migration steps:
 * 1. Create missing service_categories entries for any category string still in services.category.
 * 2. Populate services.category_id based on the old text column.
 * 3. Make category_id NOT NULL.
 * 4. Drop the legacy category column.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Insert missing categories
    // Use raw queries for simplicity and cross-db compatibility
    await queryInterface.sequelize.query(`
      INSERT INTO service_categories (id, name, created_at, updated_at)
      SELECT UUID(), s.category, NOW(), NOW()
      FROM services s
      LEFT JOIN service_categories sc ON sc.name = s.category
      WHERE sc.id IS NULL
      GROUP BY s.category;
    `);

    // 2. Update services.category_id
    await queryInterface.sequelize.query(`
      UPDATE services s
      JOIN service_categories sc ON sc.name = s.category
      SET s.category_id = sc.id
      WHERE s.category_id IS NULL;
    `);

    // 3. Make category_id NOT NULL
    await queryInterface.changeColumn('services', 'category_id', {
      type: Sequelize.STRING(36),
      allowNull: false,
      references: {
        model: 'service_categories',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    // 4. Drop old column
    await queryInterface.removeColumn('services', 'category');
  },

  down: async (queryInterface, Sequelize) => {
    // Recreate the category column (make nullable)
    await queryInterface.addColumn('services', 'category', {
      type: Sequelize.STRING(50),
      allowNull: true,
    });

    // Repopulate services.category from joined table
    await queryInterface.sequelize.query(`
      UPDATE services s
      JOIN service_categories sc ON sc.id = s.category_id
      SET s.category = sc.name;
    `);

    // Make category column NOT NULL if desired (skip for safety)

    // Remove NOT NULL constraint on category_id
    await queryInterface.changeColumn('services', 'category_id', {
      type: Sequelize.STRING(36),
      allowNull: true,
      references: {
        model: 'service_categories',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },
}; 