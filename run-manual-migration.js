/**
 * Script to run the migration manually
 */

'use strict';

// Load environment variables
require('dotenv').config();

// Import models and utils
const { sequelize } = require('./src/models');

/**
 * Run the migration manually
 */
async function runManualMigration() {
  try {
    console.log('Running migration manually...');
    
    // 1. Check if day_of_week_string column exists
    try {
      await sequelize.query('SELECT day_of_week_string FROM breaks LIMIT 1');
      console.log('day_of_week_string column already exists');
    } catch (error) {
      // Column doesn't exist, create it
      await sequelize.query(`
        ALTER TABLE breaks 
        ADD COLUMN day_of_week_string ENUM('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday')
      `);
      console.log('Added day_of_week_string column to breaks table');
    }
    
    // 2. Migrate data from numeric day_of_week to string day_of_week
    const [breaks] = await sequelize.query('SELECT id, day_of_week FROM breaks');
    
    for (const breakItem of breaks) {
      const dayIndex = parseInt(breakItem.day_of_week, 10);
      if (!isNaN(dayIndex) && dayIndex >= 0 && dayIndex <= 6) {
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = dayNames[dayIndex];
        
        await sequelize.query(
          `UPDATE breaks SET day_of_week_string = '${dayName}' WHERE id = ${breakItem.id}`
        );
        console.log(`Updated break ID ${breakItem.id}: day ${dayIndex} → ${dayName}`);
      }
    }
    
    // 3. Drop the old column
    await sequelize.query('ALTER TABLE breaks DROP COLUMN day_of_week');
    console.log('Removed old day_of_week column from breaks table');
    
    // 4. Rename the new column
    await sequelize.query('ALTER TABLE breaks CHANGE day_of_week_string day_of_week ENUM("sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday")');
    console.log('Renamed day_of_week_string column to day_of_week');
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  runManualMigration();
} 