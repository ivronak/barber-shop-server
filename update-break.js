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
    console.log(`Starting update for break ID ${breakId}...`);
    
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
      console.log(`Break ID ${breakId} not found`);
      return;
    }
    
    console.log(`Found break: ${JSON.stringify({
      id: breakToUpdate.id,
      name: breakToUpdate.name,
      business_hour_id: breakToUpdate.business_hour_id,
      staff_id: breakToUpdate.staff_id,
      day_of_week: breakToUpdate.day_of_week,
      start_time: breakToUpdate.start_time,
      end_time: breakToUpdate.end_time
    }, null, 2)}`);
    
    // Determine the correct day_of_week value
    let dayOfWeek = null;
    
    // If the break has an associated business hour
    if (breakToUpdate.businessHour && breakToUpdate.businessHour.day_of_week) {
      const dayName = breakToUpdate.businessHour.day_of_week.toLowerCase();
      dayOfWeek = dayToNumber[dayName];
      
      console.log(`Business hour day: ${dayName}, numeric value: ${dayOfWeek}`);
    } else {
      console.log('No associated business hour found or business hour has no day_of_week');
      
      // Prompt for manual day_of_week input
      console.log('Please specify the day_of_week value manually:');
      console.log('0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday');
      
      // For this script, we'll set a default value (you would normally prompt for input)
      // Change this value as needed
      const manualDayOfWeek = 6; // Saturday
      dayOfWeek = manualDayOfWeek;
      
      console.log(`Using manual day_of_week value: ${dayOfWeek}`);
    }
    
    // Update the break
    if (dayOfWeek !== null) {
      await breakToUpdate.update({ day_of_week: dayOfWeek });
      console.log(`Successfully updated break ID ${breakId} with day_of_week = ${dayOfWeek}`);
    } else {
      console.log(`Could not determine day_of_week for break ID ${breakId}`);
    }
    
  } catch (error) {
    console.error('Error updating break:', error);
  } finally {
    // Close the database connection
    await Break.sequelize.close();
    console.log('Database connection closed');
  }
}

// Specify the break ID to update
const breakId = process.argv[2] || 11; // Default to break ID 11 if not specified
updateSpecificBreak(breakId); 