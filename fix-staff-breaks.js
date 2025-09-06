require('dotenv').config();
const { sequelize, Break, WorkingHour, Staff } = require('./src/models');

/**
 * This script fixes the day-of-week mismatch issue for staff-specific breaks
 * by ensuring the numeric day values in the breaks table align correctly with working hours.
 * 
 * Issue: Setting Monday as a day off in admin/slots shows Tuesday as off in the booking system
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

async function fixStaffBreakDayOfWeekValues() {
  try {
    
    
    // Get all staff
    const staffMembers = await Staff.findAll();
    
    
    // Identify and fix staff-specific breaks
    let totalUpdates = 0;
    
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
      const updates = [];
      
      for (const breakItem of staffBreaks) {
        // If break has no day_of_week value, try to infer it
        if (breakItem.day_of_week === null || breakItem.day_of_week === undefined) {
          
          
          // Use the first available working day (simplification)
          let inferredDay = null;
          let foundMatch = false;
          
          if (staffDayMap.size > 0) {
            const firstWorkingDayPair = Array.from(staffDayMap.entries())[0];
            inferredDay = firstWorkingDayPair[1];
            
            foundMatch = true;
          }
          
          if (foundMatch) {
            updates.push({
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
        } 
        // Check if we need to fix an off-by-one error (Tuesday instead of Monday)
        else {
          const currentDay = breakItem.day_of_week;
          const currentDayName = numberToDayMap[currentDay] || 'unknown';
          
          // Check if there's an off-by-one error (e.g., using 2/Tuesday instead of 1/Monday)
          const possibleOffByOneDay = currentDay > 0 ? currentDay - 1 : 6; // Handle Sunday (0) wrapping to Saturday (6)
          const possibleOffByOneDayName = numberToDayMap[possibleOffByOneDay];
          
          
          
          // Check if this is potentially an off-by-one error
          let needsUpdate = false;
          let correctDayNumber = currentDay;
          
          // If the current day doesn't match any working day but the day before does
          if (staffDayMap.has(possibleOffByOneDayName) && !staffDayMap.has(currentDayName)) {
            correctDayNumber = possibleOffByOneDay;
            needsUpdate = true;
            
          }
          
          if (needsUpdate) {
            updates.push({
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
      
      // Summary for this staff
      if (updates.length > 0) {
        
        totalUpdates += updates.length;
      }
    }
    
    // Summary
    
    if (totalUpdates === 0) {
      
    } else {
      
    }
    
    
  } catch (error) {
    console.error('Error fixing staff break day of week mismatch:', error);
  } finally {
    // Close the database connection
    await sequelize.close();
  }
}

// Execute the fix
fixStaffBreakDayOfWeekValues(); 