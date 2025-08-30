const { sequelize, Sequelize } = require('./src/models');
const models = require('./src/models');
const { Op } = Sequelize;
const { 
  generateTimeSlots, 
  convertTimeToMinutes, 
  convertMinutesToTime,
  getConsistentDayOfWeek,
  standardizeTimeFormat
} = require('./src/utils/appointment.utils');
const dayOfWeekUtils = require('./src/utils/dayOfWeekUtils');

// Set up colors for better log visibility
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Create log functions
const log = {
  info: (msg) => console.log(`${colors.cyan}[INFO]${colors.reset} ${msg}`),
  step: (step, msg) => console.log(`${colors.green}[STEP ${step}]${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  debug: (msg) => console.log(`${colors.magenta}[DEBUG]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.bright}${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  test: (name, passed) => console.log(`${colors.bright}${passed ? colors.green : colors.red}[TEST] ${name}: ${passed ? 'PASSED' : 'FAILED'}${colors.reset}`)
};

// Function to test day of week calculation
async function testDayOfWeekCalculation(date) {
  log.step(1, `Testing day of week calculation for date: ${date}`);
  
  // Method 1: Using JavaScript's Date object directly
  const jsDate = new Date(date);
  const jsDayNum = jsDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const jsDayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const jsDayName = jsDayNames[jsDayNum];
  
  log.debug(`JavaScript Date object direct calculation:`);
  log.debug(`- Date object: ${jsDate}`);
  log.debug(`- Numeric day: ${jsDayNum}`);
  log.debug(`- Day name: ${jsDayName}`);
  
  // Method 2: Using our utility function
  const { dayOfWeek, numericDayOfWeek } = getConsistentDayOfWeek(date);
  
  log.debug(`Our getConsistentDayOfWeek utility function:`);
  log.debug(`- Numeric day: ${numericDayOfWeek}`);
  log.debug(`- Day name: ${dayOfWeek}`);
  
  // Method 3: Using dayOfWeekUtils directly
  const utilsDayName = dayOfWeekUtils.getDayNameFromNumber(jsDayNum);
  
  log.debug(`Using dayOfWeekUtils directly:`);
  log.debug(`- Input numeric day: ${jsDayNum}`);
  log.debug(`- Resulting day name: ${utilsDayName}`);
  
  // Compare results
  const methodsMatch = (jsDayNum === numericDayOfWeek) && (jsDayName === dayOfWeek.toLowerCase());
  
  if (methodsMatch) {
    log.success(`Day of week calculation consistent for ${date}`);
  } else {
    log.error(`Day of week calculation INCONSISTENT for ${date}!`);
    log.error(`JS Date: numeric=${jsDayNum}, name=${jsDayName}`);
    log.error(`Our util: numeric=${numericDayOfWeek}, name=${dayOfWeek}`);
    
    if (jsDayNum !== numericDayOfWeek) {
      log.error(`NUMERIC day difference: JS=${jsDayNum}, Our=${numericDayOfWeek}, Diff=${numericDayOfWeek - jsDayNum}`);
    }
  }
  
  log.test(`Day of week consistency for ${date}`, methodsMatch);
  return { jsDay: jsDayNum, ourDay: numericDayOfWeek, date };
}

// Function to simulate time slot generation
async function testTimeSlotGeneration(date, serviceId) {
  try {
    log.step(2, `Starting time slot generation test for date=${date}, service_id=${serviceId}`);
    
    // Step 1: Parameter validation
    log.step(3, `Validating parameters`);
    if (!date || !serviceId) {
      log.error(`Missing required parameters: date=${date}, service_id=${serviceId}`);
      return { success: false, error: 'Missing required parameters' };
    }
    
    // Step 2: Get service details
    log.step(4, `Fetching service with ID ${serviceId}`);
    const service = await models.Service.findByPk(serviceId);
    if (!service) {
      log.error(`Service not found: ${serviceId}`);
      return { success: false, error: 'Service not found' };
    }
    
    const serviceDuration = service.duration;
    log.info(`Service found: ${service.name}, duration=${serviceDuration} minutes`);
    
    // Step 3: Get business settings
    log.step(5, `Fetching business settings`);
    const businessSettings = await models.BusinessSetting.findOne();
    const businessTimezone = businessSettings?.timezone || 'UTC';
    const slotDuration = businessSettings?.slot_duration || 30;
    log.info(`Business settings: timezone=${businessTimezone}, slotDuration=${slotDuration}`);
    
    // Step 4: Calculate day of week
    log.step(6, `Calculating day of week`);
    const { dayOfWeek, numericDayOfWeek } = getConsistentDayOfWeek(date);
    log.info(`Day of week: ${dayOfWeek} (${numericDayOfWeek})`);
    
    // Compare with raw JS calculation for debugging
    const jsDate = new Date(date);
    const jsDayNum = jsDate.getDay();
    log.debug(`JS Date getDay() result: ${jsDayNum}`);
    
    if (jsDayNum !== numericDayOfWeek) {
      log.warn(`DAY MISMATCH! JS getDay()=${jsDayNum}, our numericDayOfWeek=${numericDayOfWeek}`);
      log.debug(`Date object string: ${jsDate.toString()}`);
      log.debug(`Date object toISOString: ${jsDate.toISOString()}`);
      log.debug(`Timezone offset: ${jsDate.getTimezoneOffset()} minutes`);
      
      // Check if this is a timezone issue
      const utcDate = new Date(date + 'T00:00:00Z');
      log.debug(`UTC Date getDay(): ${utcDate.getDay()}`);
    }
    
    // Step 5: Check shop closure
    log.step(7, `Checking for full day shop closure`);
    const shopClosure = await models.ShopClosure.findOne({
      where: { date, is_full_day: true }
    });
    
    if (shopClosure) {
      log.info(`Shop is closed all day: ${shopClosure.reason || 'No reason specified'}`);
      return {
        success: true,
        slots: [],
        message: `The shop is closed on this day: ${shopClosure.reason || 'Shop closure'}`
      };
    }
    
    // Step 6: Check business hours
    log.step(8, `Checking business hours for day ${dayOfWeek}`);
    const businessHours = await models.BusinessHour.findOne({
      where: { day_of_week: dayOfWeek }
    });
    
    if (!businessHours || !businessHours.open_time || !businessHours.close_time) {
      log.info(`Shop is not open on ${dayOfWeek}`);
      return {
        success: true,
        slots: [],
        message: 'The shop is not open on this day'
      };
    }
    
    log.info(`Business hours: ${businessHours.open_time} - ${businessHours.close_time}`);
    
    // Step 7: Get partial closures
    log.step(9, `Fetching partial shop closures`);
    const partialClosures = await models.ShopClosure.findAll({
      where: { date, is_full_day: false }
    });
    log.info(`Found ${partialClosures.length} partial shop closures`);
    
    // Step 8: Get admin breaks
    log.step(10, `Fetching admin breaks`);
    let breaks = [];
    try {
      if (businessHours) {
        const adminBreaks = await models.Break.findAll({
          where: {
            business_hour_id: businessHours.id,
            staff_id: null,
            day_of_week: dayOfWeek,
          }
        });
        
        breaks = adminBreaks;
        log.info(`Found ${breaks.length} admin breaks for ${dayOfWeek}`);
        
        breaks.forEach((breakItem, idx) => {
          log.debug(`Break #${idx+1}: ${breakItem.name} (${breakItem.start_time}-${breakItem.end_time})`);
        });
      }
    } catch (error) {
      log.error(`Error fetching breaks: ${error.message}`);
      breaks = [];
    }
    
    // Step 9: Get existing appointments
    log.step(11, `Fetching existing appointments`);
    const existingAppointments = await models.Appointment.findAll({
      where: {
        date,
        status: {
          [Op.notIn]: ['cancelled', 'no-show']
        }
      },
    });
    log.info(`Found ${existingAppointments.length} existing appointments`);
    
    // Step 10: Generate time slots
    log.step(12, `Generating time slots`);
    const businessOpenTime = businessHours.open_time || '09:00';
    const businessCloseTime = businessHours.close_time || '18:00';
    
    log.debug(`Calling generateTimeSlots with:`);
    log.debug(`- businessOpenTime: ${businessOpenTime}`);
    log.debug(`- businessCloseTime: ${businessCloseTime}`);
    log.debug(`- slotDuration: ${slotDuration}`);
    log.debug(`- serviceDuration: ${serviceDuration}`);
    log.debug(`- breaks: ${breaks.length} items`);
    log.debug(`- existingAppointments: ${existingAppointments.length} items`);
    log.debug(`- partialClosures: ${partialClosures.length} items`);
    log.debug(`- date: ${date}`);
    log.debug(`- timezone: ${businessTimezone}`);
    
    const allSlots = generateTimeSlots(
      businessOpenTime,
      businessCloseTime,
      slotDuration,
      serviceDuration,
      [], // Empty array for staffWorkingHours (no staff-specific hours)
      breaks,
      existingAppointments,
      partialClosures,
      date,
      businessTimezone
    );
    
    // Step 11: Check results
    log.step(13, `Analyzing results`);
    const totalSlots = allSlots.length;
    const availableSlots = allSlots.filter(slot => slot.available).length;
    const unavailableSlots = totalSlots - availableSlots;
    
    log.info(`Generated ${totalSlots} total slots`);
    log.info(`- Available: ${availableSlots}`);
    log.info(`- Unavailable: ${unavailableSlots}`);
    
    if (totalSlots > 0) {
      log.debug(`Sample slot: ${JSON.stringify(allSlots[0])}`);
    }
    
    // Final result
    log.success(`Time slot generation completed successfully`);
    return {
      success: true,
      totalSlots,
      availableSlots,
      unavailableSlots,
      slots: allSlots.slice(0, 3) // Just return first 3 for brevity
    };
    
  } catch (error) {
    log.error(`Test error: ${error.message}`);
    log.error(error.stack);
    return { success: false, error: error.message };
  }
}

// Main test function
async function runTests() {
  try {
    log.info(`Starting time slot generation tests`);
    log.info(`Current server time: ${new Date().toISOString()}`);
    
    // Test 1: Test day of week calculation for multiple dates
    log.info(`\n=== TEST SET 1: Day of Week Calculation ===`);
    
    // Create an array of test dates - include dates spanning several months/years
    const testDates = [
      '2024-08-01', // Thursday
      '2024-08-02', // Friday
      '2024-08-03', // Saturday
      '2024-08-04', // Sunday
      '2024-08-05', // Monday
      '2024-08-15', // Thursday
      '2024-08-31', // Saturday (month end)
      '2024-09-01', // Sunday (month start)
      '2024-12-31', // Tuesday (year end)
      '2025-01-01', // Wednesday (year start)
    ];
    
    // Test each date and collect results
    const dayResults = [];
    for (const date of testDates) {
      const result = await testDayOfWeekCalculation(date);
      dayResults.push(result);
    }
    
    // Check for day calculation patterns/issues
    const dayIssues = dayResults.filter(r => r.jsDay !== r.ourDay);
    if (dayIssues.length > 0) {
      log.warn(`Found ${dayIssues.length} day calculation issues`);
      dayIssues.forEach(issue => {
        log.warn(`Date: ${issue.date}, JS: ${issue.jsDay}, Our: ${issue.ourDay}, Diff: ${issue.ourDay - issue.jsDay}`);
      });
    } else {
      log.success(`All day calculations matched!`);
    }
    
    // Test 1.5: Test day of week calculation with business timezone
    log.info(`\n=== TEST SET 1.5: Day of Week with Business Timezone ===`);
    
    // Get business timezone from settings
    const businessSettings = await models.BusinessSetting.findOne();
    const businessTimezone = businessSettings?.timezone || 'UTC';
    log.info(`Business timezone from database: ${businessTimezone}`);
    
    // Function to test day calculation in business timezone
    async function testDayWithBusinessTimezone(dateStr) {
      log.step(1.5, `Testing day calculation for ${dateStr} in ${businessTimezone} timezone`);
      
      // Create date with explicit timezone (UTC noon)
      const utcNoonDate = new Date(`${dateStr}T12:00:00Z`);
      log.debug(`UTC noon: ${utcNoonDate.toISOString()}`);
      
      // Calculate day of week using the UTC date
      const utcDay = utcNoonDate.getDay();
      const utcDayName = dayOfWeekUtils.getDayNameFromNumber(utcDay);
      log.debug(`UTC day: ${utcDay} (${utcDayName})`);
      
      // Use our robust method that should be timezone independent
      const robustResult = dayOfWeekUtils.getConsistentDayOfWeekFromString(dateStr);
      log.debug(`Robust method: day=${robustResult.numericDayOfWeek}, name=${robustResult.dayOfWeek}`);
      
      // Check if they match
      const match = utcDay === robustResult.numericDayOfWeek;
      if (match) {
        log.success(`Day calculation is consistent in business timezone for ${dateStr}`);
      } else {
        log.error(`Day calculation INCONSISTENT in business timezone for ${dateStr}`);
        log.error(`UTC method: ${utcDay} (${utcDayName})`);
        log.error(`Robust method: ${robustResult.numericDayOfWeek} (${robustResult.dayOfWeek})`);
      }
      
      log.test(`Business timezone day consistency for ${dateStr}`, match);
      return match;
    }
    
    // Test with critical dates
    const criticalDates = [
      '2024-08-01',   // Regular day
      '2024-08-31',   // Month end
      '2024-09-01',   // Month start
      '2024-12-31',   // Year end
      '2025-01-01'    // Year start
    ];
    
    const businessTzResults = [];
    for (const date of criticalDates) {
      const result = await testDayWithBusinessTimezone(date);
      businessTzResults.push(result);
    }
    
    const allBusinessTzMatch = businessTzResults.every(r => r === true);
    if (allBusinessTzMatch) {
      log.success(`All business timezone day calculations are consistent!`);
    } else {
      log.error(`Some business timezone day calculations are inconsistent!`);
    }
    
    // Function to create date with business timezone and test day calculation
    async function testExplicitTimezone(dateStr, timezone) {
      log.step(1.6, `Testing explicit timezone calculation for ${dateStr} in ${timezone}`);
      
      try {
        // Test with explicit timezone strings
        // Note: This requires the full date-fns-tz or Luxon library for proper timezone handling in a real app
        // For testing we'll use a simplification
        
        // Method 1: Current implementation (should be timezone independent)
        const robustResult = dayOfWeekUtils.getConsistentDayOfWeekFromString(dateStr);
        
        // Method 2: Direct JS with timezone (this is just for logging - not accurate without proper TZ library)
        // In production, you'd use something like: 
        // import { zonedTimeToUtc } from 'date-fns-tz';
        // const zoned = zonedTimeToUtc(`${dateStr} 12:00`, timezone);
        const dateWithOffset = new Date(`${dateStr}T12:00:00Z`);
        const jsDay = dateWithOffset.getDay();
        
        log.debug(`Date string: ${dateStr}`);
        log.debug(`Robust method: day=${robustResult.numericDayOfWeek}, name=${robustResult.dayOfWeek}`);
        log.debug(`Direct JS (UTC noon): day=${jsDay}, name=${dayOfWeekUtils.getDayNameFromNumber(jsDay)}`);
        
        // Adding explicit timezone offset logging
        const tzOffsets = {
          'America/Edmonton': -6, // MDT, -7 in standard time
          'America/New_York': -4, // EDT, -5 in standard time
          'UTC': 0,
          'Europe/London': +1, // BST, +0 in standard time
          'Asia/Kolkata': +5.5,
          'Asia/Tokyo': +9
        };
        
        const tzOffset = tzOffsets[timezone] || 'unknown';
        log.info(`${timezone} approximate UTC offset: ${tzOffset >= 0 ? '+' : ''}${tzOffset} hours`);
        
        // This shows what would happen if we used local timezone for the day calculation
        // (the problematic approach we're fixing)
        const simulatedLocalDate = new Date(dateStr);
        const simulatedDay = simulatedLocalDate.getDay();
        log.debug(`Simulated local timezone: day=${simulatedDay}, name=${dayOfWeekUtils.getDayNameFromNumber(simulatedDay)}`);
        
        if (simulatedDay !== robustResult.numericDayOfWeek) {
          log.warn(`Local timezone would give DIFFERENT result than our robust method!`);
          log.warn(`This confirms why the fix was necessary.`);
        }
        
        return robustResult;
      } catch (error) {
        log.error(`Error in timezone test: ${error.message}`);
        return null;
      }
    }
    
    // Test day calculation with different timezone scenarios
    log.info(`\n=== TEST SET 1.6: Explicit Timezone Tests ===`);
    
    // Test America/Edmonton (business timezone) and others for comparison
    const timezonesToTest = [
      businessTimezone, // Business timezone from DB
      'America/New_York',
      'UTC',
      'Asia/Kolkata', // IST - what your system is using
      'Asia/Tokyo'
    ];
    
    for (const timezone of timezonesToTest) {
      log.info(`\n--- Testing with ${timezone} timezone ---`);
      // Focus on dates at month/year boundaries where issues are more likely
      await testExplicitTimezone('2024-08-31', timezone); // Month end
      await testExplicitTimezone('2024-09-01', timezone); // Month start
    }
    
    // Test 2: Test time slot generation for a few dates
    log.info(`\n=== TEST SET 2: Time Slot Generation ===`);
    
    // Test service ID that exists in your database
    const serviceId = '5bdc7d21-32be-4d86-a021-361f0b5091a9'; // Update with a valid service ID from your database
    
    // Test for different dates
    for (const date of ['2024-08-01', '2024-08-15', '2024-08-31']) {
      log.info(`\n--- Testing time slots for ${date} ---`);
      const result = await testTimeSlotGeneration(date, serviceId);
      
      if (result.success) {
        log.success(`Generated ${result.totalSlots} slots (${result.availableSlots} available)`);
      } else {
        log.error(`Failed to generate slots: ${result.error}`);
      }
    }
    
    log.info(`\nAll tests completed!`);
  } catch (error) {
    log.error(`Test suite error: ${error.message}`);
    log.error(error.stack);
  } finally {
    // Close database connection
    await sequelize.close();
    log.info(`Database connection closed`);
  }
}

// Run tests
runTests(); 