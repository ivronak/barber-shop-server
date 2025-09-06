/**
 * Script to check the break directly in the database
 */

'use strict';

// Load environment variables
require('dotenv').config();

// Import models and utils
const { sequelize } = require('./src/models');

/**
 * Check break directly in the database
 */
async function checkBreak() {
  try {
    
    
    // Query the break directly
    const [results] = await sequelize.query(`SELECT * FROM breaks WHERE id = 37`);
    
    
    
    
    // Update the break directly
    await sequelize.query(`UPDATE breaks SET day_of_week = 'sunday' WHERE id = 37`);
    
    
    // Query the break again
    const [updatedResults] = await sequelize.query(`SELECT * FROM breaks WHERE id = 37`);
    
    
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the check if this script is executed directly
if (require.main === module) {
  checkBreak();
} 