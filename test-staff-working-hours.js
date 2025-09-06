// Import required modules
const { sequelize, Sequelize } = require('./src/models');
const models = require('./src/models');
const { Op } = Sequelize;
const { 
  getConsistentDayOfWeek, 
  standardizeTimeFormat 
} = require('./src/utils/appointment.utils');

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

/**
 * Test time slot generation with staff working hours
 */
async function testStaffWorkingHours() {
  try {
    log.info('====== STARTING STAFF WORKING HOURS TEST =======');
    
    // Step 1: Find a staff member to test with
    log.step(1, 'Finding a staff member for testing');
    const staff = await models.Staff.findOne({
      include: [{ model: models.User, as: 'user' }]
    });
    
    if (!staff) {
      log.error('No staff members found in the database. Test cannot proceed.');
      return { success: false, error: 'No staff members found' };
    }
    
    log.info(`Found staff member: ${staff.user.name} (ID: ${staff.id})`);
    
    // Step 2: Find a service to test with
    log.step(2, 'Finding a service for testing');
    const service = await models.Service.findOne();
    
    if (!service) {
      log.error('No services found in the database. Test cannot proceed.');
      return { success: false, error: 'No services found' };
    }
    
    log.info(`Found service: ${service.name} (ID: ${service.id})`);
    
    // Step 3: Choose a day of the week that we're going to test with
    // We'll test with Monday
    const testDay = 'monday';
    const testDate = '2025-01-06'; // This is a Monday
    log.step(3, `Using test day: ${testDay} (Date: ${testDate})`);
    
    // Step 4: Check if business hours exist for the test day
    log.step(4, `Checking if business hours exist for ${testDay}`);
    let businessHours = await models.BusinessHour.findOne({
      where: { day_of_week: testDay }
    });
    
    if (!businessHours) {
      log.info(`No business hours found for ${testDay}. Creating business hours...`);
      
      // Create business hours for this day
      businessHours = await models.BusinessHour.create({
        day_of_week: testDay,
        open_time: '09:00:00',
        close_time: '18:00:00'
      });
      
      log.success(`Created business hours for ${testDay}: 09:00:00 - 18:00:00`);
    } else {
      log.info(`Found existing business hours for ${testDay}: ${businessHours.open_time} - ${businessHours.close_time}`);
      
      // Check if open_time or close_time are null and update if necessary
      if (!businessHours.open_time || !businessHours.close_time) {
        log.info(`Business hours for ${testDay} have null values. Updating...`);
        
        // Update existing business hours with valid values
        await businessHours.update({
          open_time: '09:00:00',
          close_time: '18:00:00'
        });
        
        log.success(`Updated business hours for ${testDay}: 09:00:00 - 18:00:00`);
      }
    }
    
    // Step 5: Create or update staff working hours for this day
    log.step(5, `Setting up staff working hours for ${testDay}`);
    
    // Remove any existing working hours for this staff on this day
    await models.WorkingHour.destroy({
      where: {
        staff_id: staff.id,
        day_of_week: testDay
      }
    });
    
    // Create two working hour periods for the staff
    // Morning shift: 9:00 AM - 12:00 PM
    const morningShift = await models.WorkingHour.create({
      staff_id: staff.id,
      day_of_week: testDay,
      start_time: '09:00:00',
      end_time: '12:00:00'
    });
    
    // Afternoon shift: 2:00 PM - 5:00 PM
    const afternoonShift = await models.WorkingHour.create({
      staff_id: staff.id,
      day_of_week: testDay,
      start_time: '14:00:00',
      end_time: '17:00:00'
    });
    
    log.success(`Created staff working hours for ${staff.user.name} on ${testDay}:`);
    log.info(`- Morning shift: 09:00:00 - 12:00:00`);
    log.info(`- Afternoon shift: 14:00:00 - 17:00:00`);
    
    // Step 6: Create a staff break
    log.step(6, `Creating staff break for ${testDay}`);
    
    // Remove any existing staff breaks for this day
    await models.Break.destroy({
      where: {
        staff_id: staff.id,
        day_of_week: testDay
      }
    });
    
    // Create a staff break for the afternoon shift
    const staffBreak = await models.Break.create({
      staff_id: staff.id,
      day_of_week: testDay,
      name: 'Coffee Break',
      start_time: '15:00:00',
      end_time: '15:30:00'
    });
    
    log.success(`Created staff break for ${staff.user.name} on ${testDay}: 15:00:00 - 15:30:00`);
    
    // Step 7: Now simulate the API call
    log.step(7, `Simulating API call to getBookingSlots for date=${testDate}, staff_id=${staff.id}, service_id=${service.id}`);
    
    // Manually construct the request object
    const req = {
      query: {
        date: testDate,
        staff_id: staff.id,
        service_id: service.id
      }
    };
    
    // Manually construct a simple response object to capture the response
    let responseStatus = 0;
    let responseBody = null;
    
    const res = {
      status: function(status) {
        responseStatus = status;
        return this;
      },
      json: function(body) {
        responseBody = body;
        return this;
      }
    };
    
    // Import the controller
    const controller = require('./src/controllers/publicBooking.controller');
    
    // Call the controller method directly
    await controller.getBookingSlots(req, res);
    
    // Step 8: Verify the response
    log.step(8, 'Verifying API response');
    
    // Check if we got a 200 status code
    if (responseStatus !== 200) {
      log.error(`Unexpected status code: ${responseStatus}. Expected 200.`);
      log.debug(`Response body: ${JSON.stringify(responseBody)}`);
      return { success: false, error: 'Unexpected status code' };
    }
    
    // Check if success flag is true
    if (!responseBody.success) {
      log.error('Response success flag is false.');
      log.debug(`Response body: ${JSON.stringify(responseBody)}`);
      return { success: false, error: 'Response indicates failure' };
    }
    
    // Check if slots array is present
    if (!Array.isArray(responseBody.slots)) {
      log.error(`Expected slots array, got ${typeof responseBody.slots}.`);
      log.debug(`Response body: ${JSON.stringify(responseBody)}`);
      return { success: false, error: 'Missing slots array' };
    }
    
    // Count all slots and available slots
    const allSlots = responseBody.slots;
    const availableSlots = allSlots.filter(slot => slot.available);
    
    log.info(`Total slots: ${allSlots.length}, Available slots: ${availableSlots.length}`);
    
    // Step 9: Verify that slots are only available during working hours
    log.step(9, 'Verifying available slots match working hours');
    
    // Group slots by availability
    const slotsByHour = {};
    allSlots.forEach(slot => {
      const hour = slot.time.substring(0, 2);
      if (!slotsByHour[hour]) {
        slotsByHour[hour] = { total: 0, available: 0 };
      }
      slotsByHour[hour].total++;
      if (slot.available) {
        slotsByHour[hour].available++;
      }
    });
    
    // Print slot availability by hour
    for (const hour in slotsByHour) {
      log.info(`Hour ${hour}: ${slotsByHour[hour].available}/${slotsByHour[hour].total} slots available`);
    }
    
    // Check for slots outside working hours
    let invalidSlotFound = false;
    
    for (const slot of allSlots) {
      const slotHour = parseInt(slot.time.substring(0, 2));
      const slotMinute = parseInt(slot.time.substring(3, 5));
      const slotTimeInMinutes = slotHour * 60 + slotMinute;
      
      // Check if the slot is within the morning shift (9:00 AM - 12:00 PM)
      const inMorningShift = 
        slotTimeInMinutes >= 9 * 60 && 
        slotTimeInMinutes < 12 * 60;
      
      // Check if the slot is within the afternoon shift (2:00 PM - 5:00 PM)
      const inAfternoonShift = 
        slotTimeInMinutes >= 14 * 60 && 
        slotTimeInMinutes < 17 * 60;
      
      // Check if the slot is during the break (3:00 PM - 3:30 PM)
      const duringBreak = 
        slotTimeInMinutes >= 15 * 60 && 
        slotTimeInMinutes < 15 * 60 + 30;
      
      // The slot should be available only if it's within a shift and not during a break
      const shouldBeAvailable = (inMorningShift || inAfternoonShift) && !duringBreak;
      
      if (slot.available !== shouldBeAvailable) {
        log.error(`Slot ${slot.time} has incorrect availability. Expected: ${shouldBeAvailable}, Actual: ${slot.available}, Reason: ${slot.unavailableReason || 'None'}`);
        invalidSlotFound = true;
      }
    }
    
    if (invalidSlotFound) {
      log.error('Some slots have incorrect availability based on working hours and breaks.');
      return { success: false, error: 'Invalid slot availability' };
    }
    
    // Based on the slotDuration (30 minutes) and our working hours:
    // Morning shift: 9:00 - 12:00 = 3 hours = 6 slots of 30 min each
    // Afternoon shift: 14:00 - 17:00 = 3 hours = 6 slots
    // Coffee break: 15:00 - 15:30 = 1 slot
    // Total expected available slots: 6 + 6 - 1 = 11
    const expectedAvailableSlots = 11;
    
    if (availableSlots.length !== expectedAvailableSlots) {
      log.error(`Expected ${expectedAvailableSlots} available slots, got ${availableSlots.length}.`);
      return { success: false, error: 'Unexpected number of available slots' };
    }
    
    log.success(`Found correct number of available slots: ${availableSlots.length}`);
    log.test('Staff working hours and breaks are reflected correctly in time slots', true);
    return { success: true };
    
  } catch (error) {
    log.error(`Test failed with error: ${error.message}`);
    log.debug(error.stack);
    return { success: false, error: error.message };
  } finally {
    await sequelize.close();
    log.info('Database connection closed');
  }
}

// Run the test function
(async () => {
  try {
    
    const result = await testStaffWorkingHours();
    
    if (result.success) {
      log.info('All tests passed successfully!');
      process.exit(0);
    } else {
      log.error(`Tests failed: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    log.error(`Unhandled error: ${error.message}`);
    log.debug(error.stack);
    process.exit(1);
  }
})(); 