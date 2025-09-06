/**
 * Script to fix breaks with incorrect or missing day_of_week values
 * 
 * This script:
 * 1. Updates breaks with NULL day_of_week values to match their business_hour's day
 * 2. Ensures day_of_week is stored as an integer (0-6)
 */

const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import models
const { Break, BusinessHour } = require('./src/models');

// Map day of week strings to numeric values
const dayToNumber = {
  'sunday': 0,
  'monday': 1,
  'tuesday': 2,
  'wednesday': 3,
  'thursday': 4,
  'friday': 5,
  'saturday': 6
};

async function fixBreaksWithNullDayOfWeek() {
  try {
    
    
    // Get all breaks with null day_of_week
    const breaksToFix = await Break.findAll({
      where: {
        day_of_week: null
      },
      include: [
        {
          model: BusinessHour,
          as: 'businessHour',
          required: false
        }
      ]
    });
    
    
    
    // Process each break
    const results = {
      updated: 0,
      failed: 0,
      skipped: 0
    };
    
    for (const breakItem of breaksToFix) {
      try {
        // If the break has a business hour association
        if (breakItem.businessHour && breakItem.businessHour.day_of_week) {
          const dayOfWeekString = breakItem.businessHour.day_of_week.toLowerCase();
          const numericDayOfWeek = dayToNumber[dayOfWeekString];
          
          if (numericDayOfWeek !== undefined) {
            // Update the break with the correct day_of_week
            await breakItem.update({ day_of_week: numericDayOfWeek });
            
            
            results.updated++;
          } else {
            
            results.skipped++;
          }
        } else {
          
          results.skipped++;
        }
      } catch (error) {
        console.error(`Failed to update break ID ${breakItem.id}:`, error.message);
        results.failed++;
      }
    }
    
    
    
    
    
    
    
  } catch (error) {
    console.error('Error fixing breaks:', error);
  } finally {
    // Close the database connection
    await Break.sequelize.close();
    
  }
}

// Run the function
fixBreaksWithNullDayOfWeek(); 