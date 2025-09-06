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
 * Test staff availability check when no working hours are defined for a specific day
 */
async function testStaffAvailabilityCheck() {
  try {
    log.info('====== STARTING STAFF AVAILABILITY TEST =======');
    
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
    // We'll test with Wednesday
    const testDay = 'wednesday';
    const testDate = '2025-01-01'; // This is a Wednesday
    log.step(3, `Using test day: ${testDay} (Date: ${testDate})`);
    
    // Step 3.5: Check if business hours exist for the test day
    log.step(3.5, `Checking if business hours exist for ${testDay}`);
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
    
    // Step 4: Ensure there are no working hours for this staff on this day
    log.step(4, `Removing any existing working hours for staff on ${testDay}`);
    await models.WorkingHour.destroy({
      where: {
        staff_id: staff.id,
        day_of_week: testDay
      }
    });
    
    // Verify there are no working hours
    const workingHours = await models.WorkingHour.findAll({
      where: {
        staff_id: staff.id,
        day_of_week: testDay
      }
    });
    
    if (workingHours.length > 0) {
      log.error(`Failed to remove working hours for staff on ${testDay}. Test cannot proceed.`);
      return { success: false, error: 'Failed to remove working hours' };
    }
    
    log.success(`Confirmed no working hours exist for staff ID ${staff.id} on ${testDay}`);
    
    // Step 5: Now simulate the API call
    log.step(5, `Simulating API call to getBookingSlots for date=${testDate}, staff_id=${staff.id}, service_id=${service.id}`);
    
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
    
    // Step 6: Verify the response
    log.step(6, 'Verifying API response');
    
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
    
    // Check if slots array is empty
    if (!Array.isArray(responseBody.slots) || responseBody.slots.length > 0) {
      log.error(`Expected empty slots array, got ${responseBody.slots?.length || 'undefined'} slots.`);
      log.debug(`Response body: ${JSON.stringify(responseBody)}`);
      return { success: false, error: 'Non-empty slots array' };
    }
    
    // Check if we have the appropriate message
    const expectedMessagePart = `${staff.user.name} is not available on ${testDay}`;
    if (!responseBody.message || !responseBody.message.includes(expectedMessagePart)) {
      log.error(`Expected message containing "${expectedMessagePart}", got "${responseBody.message}".`);
      log.debug(`Response body: ${JSON.stringify(responseBody)}`);
      return { success: false, error: 'Incorrect message' };
    }
    
    log.success(`Response correctly indicates that ${staff.user.name} is not available on ${testDay}`);
    log.debug(`Full response: ${JSON.stringify(responseBody)}`);
    
    log.test('Staff availability check when no working hours exist', true);
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
    console.log('Using standard development database configuration');
    const result = await testStaffAvailabilityCheck();
    
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