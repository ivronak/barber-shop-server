/**
 * Script to update existing breaks to use string day_of_week values
 */

'use strict';

// Load environment variables
require('dotenv').config();

// Import models and utils
const { sequelize, Break } = require('./src/models');
const dayOfWeekUtils = require('./src/utils/dayOfWeekUtils');

/**
 * Update existing breaks to use string day_of_week values
 */
async function updateExistingBreaks() {
  try {
    
    
    // Get all breaks
    const breaks = await Break.findAll();
    
    
    let updatedCount = 0;
    
    // Process each break
    for (const breakItem of breaks) {
      const dayValue = breakItem.day_of_week;
      
      // Check if the day_of_week is a number (stored as string in DB)
      if (!isNaN(dayValue) && dayValue !== null) {
        const dayIndex = parseInt(dayValue, 10);
        if (dayIndex >= 0 && dayIndex <= 6) {
          // Convert to string day name
          const dayName = dayOfWeekUtils.getDayNameFromNumber(dayIndex);
          
          // Update the break
          await breakItem.update({ day_of_week: dayName });
          updatedCount++;
          
        }
      }
    }
    
    
  } catch (error) {
    console.error('Update error:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the update if this script is executed directly
if (require.main === module) {
  updateExistingBreaks();
} 