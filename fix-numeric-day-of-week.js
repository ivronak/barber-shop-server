/**
 * Script to fix any breaks with numeric day_of_week values
 */

'use strict';

// Load environment variables
require('dotenv').config();

// Import models and utils
const { sequelize, Break } = require('./src/models');
const dayOfWeekUtils = require('./src/utils/dayOfWeekUtils');

/**
 * Fix breaks with numeric day_of_week values
 */
async function fixNumericDayOfWeek() {
  try {
    
    
    // Query all breaks
    const breaks = await Break.findAll();
    
    
    let fixedCount = 0;
    
    // Process each break
    for (const breakItem of breaks) {
      const dayValue = breakItem.day_of_week;
      
      // Check if day_of_week is a number or a numeric string
      if (
        (typeof dayValue === 'number' && dayValue >= 0 && dayValue <= 6) || 
        (typeof dayValue === 'string' && !isNaN(parseInt(dayValue, 10)) && parseInt(dayValue, 10) >= 0 && parseInt(dayValue, 10) <= 6)
      ) {
        const numericDay = typeof dayValue === 'number' ? dayValue : parseInt(dayValue, 10);
        const dayName = dayOfWeekUtils.getDayNameFromNumber(numericDay);
        
        
        
        // Update the break
        await breakItem.update({ day_of_week: dayName });
        fixedCount++;
      }
    }
    
    
    
    // Verify the fix
    const verifyBreaks = await Break.findAll();
    
    verifyBreaks.forEach(breakItem => {
      
    });
    
  } catch (error) {
    console.error('Error fixing breaks:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the fix
fixNumericDayOfWeek(); 