/**
 * Direct update script for break ID 11
 */
const { Sequelize } = require('sequelize');
require('dotenv').config();

// Import models
const { Break, BusinessHour } = require('./src/models');

async function directUpdateBreaks() {
  try {
    console.log('Starting direct update of breaks...');
    
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
        console.log(`Business hour ID ${hour.id} is for ${dayName} (day ${dayNumber})`);
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
      
      console.log(`Updated ${affectedRows} breaks for business hour ID ${businessHourId} to day ${dayNumber}`);
    }
    
    console.log(`\nTotal breaks updated: ${updatedCount}`);
    
    // Verify the updates
    const remainingNullBreaks = await Break.count({
      where: { day_of_week: null }
    });
    
    console.log(`Remaining breaks with null day_of_week: ${remainingNullBreaks}`);
    
    if (remainingNullBreaks > 0) {
      console.log('\nWarning: Some breaks still have null day_of_week values.');
      console.log('These might be breaks without a business_hour_id or with invalid business_hour_id.');
      
      // Get details of remaining null breaks
      const nullBreaks = await Break.findAll({
        where: { day_of_week: null },
        attributes: ['id', 'name', 'business_hour_id', 'staff_id']
      });
      
      console.log('\nBreaks with null day_of_week:');
      nullBreaks.forEach(breakItem => {
        console.log(`ID: ${breakItem.id}, Name: ${breakItem.name}, Business Hour ID: ${breakItem.business_hour_id}, Staff ID: ${breakItem.staff_id}`);
      });
    }
    
  } catch (error) {
    console.error('Error updating breaks:', error);
  } finally {
    // Close the database connection
    await Break.sequelize.close();
    console.log('Database connection closed');
  }
}

// Run the function
directUpdateBreaks(); 