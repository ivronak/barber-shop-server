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
    console.log('Checking breaks in the database...');
    
    // Query breaks directly
    const [breaks] = await sequelize.query('SELECT * FROM breaks');
    
    console.log('Found', breaks.length, 'breaks:');
    breaks.forEach(breakItem => {
      console.log(`- ID: ${breakItem.id}, Name: ${breakItem.name}, Day: ${breakItem.day_of_week}, Time: ${breakItem.start_time}-${breakItem.end_time}`);
    });
    
    console.log('\nBreaks with day_of_week = 0:');
    const [sundayBreaks] = await sequelize.query("SELECT * FROM breaks WHERE day_of_week = '0'");
    console.log('Found', sundayBreaks.length, 'breaks with day_of_week = 0');
    sundayBreaks.forEach(breakItem => {
      console.log(`- ID: ${breakItem.id}, Name: ${breakItem.name}, Day: ${breakItem.day_of_week}, Time: ${breakItem.start_time}-${breakItem.end_time}`);
    });
    
    console.log('\nBreaks with day_of_week = sunday:');
    const [sundayStringBreaks] = await sequelize.query("SELECT * FROM breaks WHERE day_of_week = 'sunday'");
    console.log('Found', sundayStringBreaks.length, 'breaks with day_of_week = sunday');
    sundayStringBreaks.forEach(breakItem => {
      console.log(`- ID: ${breakItem.id}, Name: ${breakItem.name}, Day: ${breakItem.day_of_week}, Time: ${breakItem.start_time}-${breakItem.end_time}`);
    });
    
  } catch (error) {
    console.error('Error checking breaks:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the check
checkBreaks(); 