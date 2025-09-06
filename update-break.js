/**
 * Script to update the specific break with ID 11
 */

const { Sequelize } = require('sequelize');
require('dotenv').config();

// Import models
const { Break, BusinessHour } = require('./src/models');

// Map of day names to numeric values
const dayToNumber = {
  'sunday': 0,
  'monday': 1,
  'tuesday': 2,
  'wednesday': 3,
  'thursday': 4,
  'friday': 5,
  'saturday': 6
};

async function updateSpecificBreak(breakId) {
  try {
    
    
    // Find the break
    const breakToUpdate = await Break.findByPk(breakId, {
      include: [
        {
          model: BusinessHour,
          as: 'businessHour',
          required: false
        }
      ]
    });
    
    if (!breakToUpdate) {
      
      return;
    }
    
 
    
    // Determine the correct day_of_week value
    let dayOfWeek = null;
    
    // If the break has an associated business hour
    if (breakToUpdate.businessHour && breakToUpdate.businessHour.day_of_week) {
      const dayName = breakToUpdate.businessHour.day_of_week.toLowerCase();
      dayOfWeek = dayToNumber[dayName];
      
      
    } else {
      
      
      // Prompt for manual day_of_week input
      
      
      
      // For this script, we'll set a default value (you would normally prompt for input)
      // Change this value as needed
      const manualDayOfWeek = 6; // Saturday
      dayOfWeek = manualDayOfWeek;
      
      
    }
    
    // Update the break
    if (dayOfWeek !== null) {
      await breakToUpdate.update({ day_of_week: dayOfWeek });
      
    } else {
      
    }
    
  } catch (error) {
    console.error('Error updating break:', error);
  } finally {
    // Close the database connection
    await Break.sequelize.close();
    
  }
}

// Specify the break ID to update
const breakId = process.argv[2] || 11; // Default to break ID 11 if not specified
updateSpecificBreak(breakId); 