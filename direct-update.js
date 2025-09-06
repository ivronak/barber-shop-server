/**
 * Direct update script for break ID 11
 */
const { Sequelize } = require('sequelize');
require('dotenv').config();

// Import models
const { Break, BusinessHour } = require('./src/models');

async function directUpdateBreaks() {
  try {
    
    
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
    
    // Get all business hours to create a mapping
    const businessHours = await BusinessHour.findAll();
    const businessHourMap = {};
    
    for (const hour of businessHours) {
      const dayName = hour.day_of_week.toLowerCase();
      const dayNumber = dayToNumber[dayName];
      
      if (dayNumber !== undefined) {
        businessHourMap[hour.id] = dayNumber;
        
      }
    }
    
    // Direct database update using Sequelize query
    // This is more efficient than updating each break individually
    let updatedCount = 0;
    
    for (const [businessHourId, dayNumber] of Object.entries(businessHourMap)) {
      const result = await Break.update(
        { day_of_week: dayNumber },
        { 
          where: { 
            business_hour_id: businessHourId,
            day_of_week: null
          }
        }
      );
      
      const affectedRows = result[0];
      updatedCount += affectedRows;
      
      
    }
    
    
    
    // Verify the updates
    const remainingNullBreaks = await Break.count({
      where: { day_of_week: null }
    });
    
    
    
    if (remainingNullBreaks > 0) {
      
      
      
      // Get details of remaining null breaks
      const nullBreaks = await Break.findAll({
        where: { day_of_week: null },
        attributes: ['id', 'name', 'business_hour_id', 'staff_id']
      });
      
      
      nullBreaks.forEach(breakItem => {
        
      });
    }
    
  } catch (error) {
    console.error('Error updating breaks:', error);
  } finally {
    // Close the database connection
    await Break.sequelize.close();
    
  }
}

// Run the function
directUpdateBreaks(); 