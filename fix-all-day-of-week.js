require('dotenv').config();
const { sequelize, Break, BusinessHour, WorkingHour, Staff } = require('./src/models');

/**
 * This comprehensive script fixes the day-of-week mismatch issue across the entire system
 * by correcting the numeric day values in the breaks table to align with business hours
 * and working hours.
 * 
 * Issue: Setting Monday as a day off in admin/slots shows Tuesday as off in the booking system
 * 
 * Root cause: There is an off-by-one error in how the numeric day values are handled in the breaks table.
 * This script specifically looks for and corrects this pattern.
 */

// Define the correct string to number mapping
const dayToNumberMap = {
  'sunday': 0,
  'monday': 1,
  'tuesday': 2,
  'wednesday': 3,
  'thursday': 4,
  'friday': 5,
  'saturday': 6
};

// Define the number to string mapping for logging
const numberToDayMap = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday'
};

async function fixAllDayOfWeekValues() {
  try {
    
    
    
    // Track total updates
    let totalUpdates = 0;
    
    // PART 1: Fix admin breaks (associated with business hours)
    
    
    // Get all business hours
    const businessHours = await BusinessHour.findAll();
    
    
    // Get all admin breaks (staff_id is null)
    const adminBreaks = await Break.findAll({
      where: { staff_id: null }
    });
    
    
    const adminUpdates = [];
    
    for (const businessHour of businessHours) {
      const dayString = businessHour.day_of_week.toLowerCase();
      const correctDayNumber = dayToNumberMap[dayString];
      
      
      
      // Find breaks associated with this business hour
      const relatedBreaks = adminBreaks.filter(b => b.business_hour_id === businessHour.id);
      
      
      
      for (const breakItem of relatedBreaks) {
        const currentDay = breakItem.day_of_week;
        
        // Check if the day is null or undefined
        if (currentDay === null || currentDay === undefined) {
          
          
          adminUpdates.push({
            breakId: breakItem.id,
            oldValue: null,
            newValue: correctDayNumber
          });
          
          // Update the break
          await Break.update(
            { day_of_week: correctDayNumber },
            { where: { id: breakItem.id } }
          );
          continue;
        }
        
        // Check for the specific off-by-one error (Monday set as Tuesday)
        // If the current day is one more than the correct day, it's the off-by-one error we're looking for
        const isOffByOne = (currentDay === correctDayNumber + 1) || 
                           (correctDayNumber === 6 && currentDay === 0); // Handle Saturday (6) -> Sunday (0) wrap
        
        
        
        
        
        if (currentDay !== correctDayNumber) {
          
          
          adminUpdates.push({
            breakId: breakItem.id,
            oldValue: currentDay,
            newValue: correctDayNumber
          });
          
          // Update the break
          await Break.update(
            { day_of_week: correctDayNumber },
            { where: { id: breakItem.id } }
          );
        }
      }
    }
    
    // Update total count
    totalUpdates += adminUpdates.length;
    
    // PART 2: Fix staff breaks
    
    
    // Get all staff
    const staffMembers = await Staff.findAll();
    
    
    const staffUpdates = [];
    
    for (const staff of staffMembers) {
      
      
      // Get staff working hours
      const workingHours = await WorkingHour.findAll({
        where: { staff_id: staff.id, is_break: false }
      });
      
      
      
      // Get staff breaks
      const staffBreaks = await Break.findAll({
        where: { staff_id: staff.id }
      });
      
      
      
      if (staffBreaks.length === 0) {
        continue; // Skip to next staff member
      }
      
      // Create a map of day string to correct numeric value
      const staffDayMap = new Map();
      for (const workingHour of workingHours) {
        const dayString = workingHour.day_of_week.toLowerCase();
        const correctDayNumber = dayToNumberMap[dayString];
        staffDayMap.set(dayString, correctDayNumber);
        
      }
      
      // Check and update each break's day_of_week
      for (const breakItem of staffBreaks) {
        const currentDay = breakItem.day_of_week;
        
        // If break has no day_of_week value, try to infer it
        if (currentDay === null || currentDay === undefined) {
          
          
          // Use the first available working day (simplification)
          let inferredDay = null;
          let foundMatch = false;
          
          if (staffDayMap.size > 0) {
            const firstWorkingDayPair = Array.from(staffDayMap.entries())[0];
            inferredDay = firstWorkingDayPair[1];
            
            foundMatch = true;
          }
          
          if (foundMatch) {
            staffUpdates.push({
              breakId: breakItem.id,
              oldValue: null,
              newValue: inferredDay
            });
            
            // Update the break
            await Break.update(
              { day_of_week: inferredDay },
              { where: { id: breakItem.id } }
            );
          } else {
            
          }
          continue;
        }
        
        // If break has a numeric day value, check for off-by-one error
        const currentDayName = numberToDayMap[currentDay] || 'unknown';
        
        // Check if there's an off-by-one error
        let correctDayNumber = null;
        let needsUpdate = false;
        
        // Check if current day is a valid working day for this staff
        const isCurrentDayValid = Array.from(staffDayMap.values()).includes(currentDay);
        
        // If current day is not valid for this staff, check if it's off-by-one
        if (!isCurrentDayValid) {
          // Calculate the day before (accounting for wrap-around)
          const dayBefore = currentDay > 0 ? currentDay - 1 : 6;
          const dayBeforeName = numberToDayMap[dayBefore];
          
          // Check if the day before is a valid working day
          const isDayBeforeValid = Array.from(staffDayMap.values()).includes(dayBefore);
          
          if (isDayBeforeValid) {
            // This is likely an off-by-one error
            correctDayNumber = dayBefore;
            needsUpdate = true;
            
          }
        }
        
        // If we need to update this break
        if (needsUpdate && correctDayNumber !== null) {
          staffUpdates.push({
            breakId: breakItem.id,
            oldValue: currentDay,
            newValue: correctDayNumber
          });
          
          // Update the break
          await Break.update(
            { day_of_week: correctDayNumber },
            { where: { id: breakItem.id } }
          );
        } else {
          
        }
      }
    }
    
    // Update total count
    totalUpdates += staffUpdates.length;
    
    // Final Summary
    
    
    
    
    
    if (totalUpdates === 0) {
      
    } else {
      
    }
    
  } catch (error) {
    console.error('Error fixing day of week mismatch:', error);
  } finally {
    // Close the database connection
    await sequelize.close();
  }
}

// Execute the fix
fixAllDayOfWeekValues();
