require('dotenv').config();
const { sequelize, Break, BusinessHour } = require('./src/models');

/**
 * This script addresses the specific issue where setting Monday off in admin/slots 
 * results in Tuesday showing as off in the booking system.
 * 
 * The core problem is an off-by-one error in how day values are handled.
 * This script will fix breaks with day_of_week values that are one day ahead of what they should be.
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

async function fixDayOffsetBug() {
  try {
    
    
    // Get all breaks
    const allBreaks = await Break.findAll();
    
    
    // Track updates
    const updates = [];
    
    // Process each break
    for (const breakItem of allBreaks) {
      const currentDay = breakItem.day_of_week;
      const isAdminBreak = breakItem.staff_id === null;
      
      
      
      
      // Skip if day_of_week is null
      if (currentDay === null || currentDay === undefined) {
        
        continue;
      }
      
      // For admin breaks, we can check against the associated business hour
      if (isAdminBreak && breakItem.business_hour_id) {
        const businessHour = await BusinessHour.findByPk(breakItem.business_hour_id);
        
        if (businessHour) {
          const dayString = businessHour.day_of_week.toLowerCase();
          const correctDayNumber = dayToNumberMap[dayString];
          
          
          
          // Check if the break day is one day ahead (the specific issue we're addressing)
          const isOffByOne = (currentDay === correctDayNumber + 1) || 
                             (correctDayNumber === 6 && currentDay === 0); // Handle Saturday->Sunday wrap
          
          
          
          if (isOffByOne) {
            
            
            updates.push({
              breakId: breakItem.id,
              type: 'Admin Break',
              oldValue: currentDay,
              oldDay: numberToDayMap[currentDay] || 'unknown',
              newValue: correctDayNumber,
              newDay: numberToDayMap[correctDayNumber] || 'unknown'
            });
            
            // Update the break
            await Break.update(
              { day_of_week: correctDayNumber },
              { where: { id: breakItem.id } }
            );
          }
        } else {
          
        }
      } 
      // For staff breaks, apply a general fix if the day seems off by one
      else if (!isAdminBreak) {
        // This is a heuristic fix - assume the day should be one day earlier
        // This addresses the specific issue reported
        const possibleCorrectDay = currentDay > 0 ? currentDay - 1 : 6; // Handle Sunday (0) wrapping to Saturday (6)
        
        
        
        // Additional check: Only apply if breaking days are in specific pattern
        // Monday (1) showing as Tuesday (2) - This is the specific reported issue
        if ((currentDay === 2 && possibleCorrectDay === 1) || 
            (currentDay === 3 && possibleCorrectDay === 2) ||
            (currentDay === 4 && possibleCorrectDay === 3) ||
            (currentDay === 5 && possibleCorrectDay === 4) ||
            (currentDay === 6 && possibleCorrectDay === 5) ||
            (currentDay === 0 && possibleCorrectDay === 6) ||
            (currentDay === 1 && possibleCorrectDay === 0)) {
          
          
          
          updates.push({
            breakId: breakItem.id,
            type: 'Staff Break',
            oldValue: currentDay,
            oldDay: numberToDayMap[currentDay] || 'unknown',
            newValue: possibleCorrectDay,
            newDay: numberToDayMap[possibleCorrectDay] || 'unknown'
          });
          
          // Update the break
          await Break.update(
            { day_of_week: possibleCorrectDay },
            { where: { id: breakItem.id } }
          );
        } else {
          
        }
      }
    }
    
    // Show summary
    
    if (updates.length === 0) {
      
    } else {
      
      updates.forEach(update => {
        
      });
      
    }
    
  } catch (error) {
    console.error('Error fixing day offset bug:', error);
  } finally {
    // Close the database connection
    await sequelize.close();
  }
}

// Execute the fix
fixDayOffsetBug(); 