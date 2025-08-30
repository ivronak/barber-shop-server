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
    console.log('Starting staff break day-of-week mismatch fix...');
    
    // Get all staff
    const staffMembers = await Staff.findAll();
    console.log(`Found ${staffMembers.length} staff members`);
    
    // Identify and fix staff-specific breaks
    let totalUpdates = 0;
    
    for (const staff of staffMembers) {
      console.log(`\nChecking breaks for staff ID: ${staff.id}`);
      
      // Get staff working hours
      const workingHours = await WorkingHour.findAll({
        where: { staff_id: staff.id, is_break: false }
      });
      
      console.log(`Found ${workingHours.length} working hour entries for this staff`);
      
      // Get staff breaks
      const staffBreaks = await Break.findAll({
        where: { staff_id: staff.id }
      });
      
      console.log(`Found ${staffBreaks.length} break entries for this staff`);
      
      if (staffBreaks.length === 0) {
        continue; // Skip to next staff member
      }
      
      // Create a map of day string to correct numeric value
      const staffDayMap = new Map();
      for (const workingHour of workingHours) {
        const dayString = workingHour.day_of_week.toLowerCase();
        const correctDayNumber = dayToNumberMap[dayString];
        staffDayMap.set(dayString, correctDayNumber);
        console.log(`Staff works on ${dayString} (day number: ${correctDayNumber})`);
      }
      
      // Check and update each break's day_of_week
      const updates = [];
      
      for (const breakItem of staffBreaks) {
        // If break has no day_of_week value, try to infer it
        if (breakItem.day_of_week === null || breakItem.day_of_week === undefined) {
          console.log(`- Break ID ${breakItem.id} has null day_of_week, attempting to infer from associated working hours`);
          
          // Use the first available working day (simplification)
          let inferredDay = null;
          let foundMatch = false;
          
          if (staffDayMap.size > 0) {
            const firstWorkingDayPair = Array.from(staffDayMap.entries())[0];
            inferredDay = firstWorkingDayPair[1];
            console.log(`  -> Inferred day_of_week = ${inferredDay} (${firstWorkingDayPair[0]})`);
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
            console.log(`  -> Could not infer day_of_week for break ID ${breakItem.id}, no working hours found`);
          }
        } 
        // Check if we need to fix an off-by-one error (Tuesday instead of Monday)
        else {
          const currentDay = breakItem.day_of_week;
          const currentDayName = numberToDayMap[currentDay] || 'unknown';
          
          // Check if there's an off-by-one error (e.g., using 2/Tuesday instead of 1/Monday)
          const possibleOffByOneDay = currentDay > 0 ? currentDay - 1 : 6; // Handle Sunday (0) wrapping to Saturday (6)
          const possibleOffByOneDayName = numberToDayMap[possibleOffByOneDay];
          
          console.log(`- Break ID ${breakItem.id}: Current day_of_week = ${currentDay} (${currentDayName})`);
          
          // Check if this is potentially an off-by-one error
          let needsUpdate = false;
          let correctDayNumber = currentDay;
          
          // If the current day doesn't match any working day but the day before does
          if (staffDayMap.has(possibleOffByOneDayName) && !staffDayMap.has(currentDayName)) {
            correctDayNumber = possibleOffByOneDay;
            needsUpdate = true;
            console.log(`  -> Detected off-by-one error: ${currentDay} (${currentDayName}) should be ${correctDayNumber} (${possibleOffByOneDayName})`);
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
        console.log(`\nUpdated ${updates.length} breaks for staff ID: ${staff.id}`);
        totalUpdates += updates.length;
      }
    }
    
    // Summary
    console.log('\n--- Final Update Summary ---');
    if (totalUpdates === 0) {
      console.log('No staff breaks needed updating. All day_of_week values are already correct or could not be inferred.');
    } else {
      console.log(`Updated a total of ${totalUpdates} staff breaks with correct day_of_week values.`);
    }
    
    console.log('\nStaff break fix completed successfully!');
  } catch (error) {
    console.error('Error fixing staff break day of week mismatch:', error);
  } finally {
    // Close the database connection
    await sequelize.close();
  }
}

// Execute the fix
fixStaffBreakDayOfWeekValues(); 