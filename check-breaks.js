/**
 * Script to check breaks in the database
 */

'use strict';

// Load environment variables
require('dotenv').config();

// Import models and utils
const { sequelize } = require('./src/models');

/**
 * Check breaks
 */
async function checkBreaks() {
  try {
    
    
    // Query breaks directly
    const [breaks] = await sequelize.query('SELECT * FROM breaks');
    
    
    breaks.forEach(breakItem => {
      
    });
    
    
    const [sundayBreaks] = await sequelize.query("SELECT * FROM breaks WHERE day_of_week = '0'");
    
    sundayBreaks.forEach(breakItem => {
      
    });
    
    
    const [sundayStringBreaks] = await sequelize.query("SELECT * FROM breaks WHERE day_of_week = 'sunday'");
    
    sundayStringBreaks.forEach(breakItem => {
      
    });
    
  } catch (error) {
    console.error('Error checking breaks:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the check
checkBreaks(); 