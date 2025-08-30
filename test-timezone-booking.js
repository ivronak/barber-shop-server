/**
 * Simple test script for time slot generation with constraints
 */
const models = require('./src/models');
const dayOfWeekUtils = require('./src/utils/dayOfWeekUtils');
const appointmentUtils = require('./src/utils/appointment.utils');

// Log utility
const log = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  debug: (msg) => console.log(`[DEBUG] ${msg}`),
  success: (msg) => console.log(`[SUCCESS] ${msg}`),
  error: (msg) => console.log(`[ERROR] ${msg}`),
  step: (num, msg) => console.log(`[STEP ${num}] ${msg}`),
  test: (name, result) => console.log(`[TEST] ${name}: ${result ? "PASSED" : "FAILED"}`),
};

async function runTest() {
  try {
    log.info("Starting time slot constraint test");
    
    // Test date and service
    const testDate = "2024-09-05"; // Thursday
    const serviceId = "5bdc7d21-32be-4d86-a021-361f0b5091a9"; // Beard Trim - 15 minutes
    
    // 1. Get service details
    const service = await models.Service.findByPk(serviceId);
    log.info(`Service: ${service.name}, duration: ${service.duration} minutes`);
    
    // 2. Get business settings
    const businessSettings = await models.BusinessSetting.findOne();
    log.info(`Business settings: timezone=${businessSettings.timezone}, slot duration=${businessSettings.slot_duration || 30}`);
    
    // 3. Calculate day of week
    const dayResult = dayOfWeekUtils.getConsistentDayOfWeekFromString(testDate);
    log.info(`Day of week: ${dayResult.dayOfWeek} (${dayResult.numericDayOfWeek})`);
    
    // 4. Get business hours
    const businessHours = await models.BusinessHour.findOne({
      where: { day_of_week: dayResult.dayOfWeek }
    });
    
    if (!businessHours) {
      log.error(`No business hours found for ${dayResult.dayOfWeek}`);
      return;
    }
    
    log.info(`Business hours: ${businessHours.open_time} - ${businessHours.close_time}`);
    
    // Test 1: Generate slots with no constraints
    log.step(1, "Generating slots without constraints");
    const baseSlots = appointmentUtils.generateTimeSlots(
      businessHours.open_time,
      businessHours.close_time,
      businessSettings.slot_duration || 30,
      service.duration,
      [], // No breaks
      [], // No appointments
      [], // No closures
      testDate,
      businessSettings.timezone
    );
    
    const baseSlotsCount = baseSlots.filter(slot => slot.available).length;
    log.info(`Base case: ${baseSlotsCount} available slots`);
    
    // Create a test break
    log.step(2, "Creating a test break");
    const testBreak = await models.Break.create({
      business_hour_id: businessHours.id,
      staff_id: null, // Admin break
      day_of_week: dayResult.dayOfWeek,
      name: 'Test Lunch Break',
      start_time: '12:00:00',
      end_time: '13:00:00'
    });
    log.info(`Created test break: ${testBreak.name} (${testBreak.start_time}-${testBreak.end_time})`);
    
    // Test 2: Generate slots with a break
    log.step(3, "Generating slots with break constraint");
    const breakSlots = appointmentUtils.generateTimeSlots(
      businessHours.open_time,
      businessHours.close_time,
      businessSettings.slot_duration || 30,
      service.duration,
      [testBreak], // With break
      [], // No appointments
      [], // No closures
      testDate,
      businessSettings.timezone
    );
    
    const breakSlotsCount = breakSlots.filter(slot => slot.available).length;
    log.info(`With break: ${breakSlotsCount} available slots`);
    log.test("Break reduces available slots", breakSlotsCount < baseSlotsCount);
    
    // Create a test appointment
    log.step(4, "Creating a test appointment");
    const guestCustomer = await models.Customer.findOne({
      where: { email: 'guest@example.com' }
    });
    
    if (!guestCustomer) {
      log.error("Guest customer not found");
      return;
    }
    
    const testAppointment = await models.Appointment.create({
      customer_id: guestCustomer.id,
      staff_id: null,
      date: testDate,
      time: '14:00:00',
      end_time: '14:30:00',
      status: 'confirmed',
      total_amount: 25.00,
      notes: 'Test appointment',
      customer_name: 'Test Customer',
      customer_phone: '1234567890',
      customer_email: 'test@example.com'
    });
    log.info(`Created test appointment: ${testAppointment.time}-${testAppointment.end_time}`);
    
    // Test 3: Generate slots with break and appointment
    log.step(5, "Generating slots with break and appointment constraints");
    const appointmentSlots = appointmentUtils.generateTimeSlots(
      businessHours.open_time,
      businessHours.close_time,
      businessSettings.slot_duration || 30,
      service.duration,
      [testBreak], // With break
      [testAppointment], // With appointment
      [], // No closures
      testDate,
      businessSettings.timezone
    );
    
    const appointmentSlotsCount = appointmentSlots.filter(slot => slot.available).length;
    log.info(`With break and appointment: ${appointmentSlotsCount} available slots`);
    log.test("Appointment further reduces available slots", appointmentSlotsCount < breakSlotsCount);
    
    // Create a test shop closure
    log.step(6, "Creating a test shop closure");
    const testClosure = await models.ShopClosure.create({
      date: testDate,
      reason: 'Test Morning Closure',
      is_full_day: false,
      start_time: '09:00:00',
      end_time: '10:00:00'
    });
    log.info(`Created test closure: ${testClosure.reason} (${testClosure.start_time}-${testClosure.end_time})`);
    
    // Test 4: Generate slots with all constraints
    log.step(7, "Generating slots with all constraints");
    const allConstraintsSlots = appointmentUtils.generateTimeSlots(
      businessHours.open_time,
      businessHours.close_time,
      businessSettings.slot_duration || 30,
      service.duration,
      [testBreak], // With break
      [testAppointment], // With appointment
      [testClosure], // With closure
      testDate,
      businessSettings.timezone
    );
    
    const allConstraintsSlotsCount = allConstraintsSlots.filter(slot => slot.available).length;
    log.info(`With all constraints: ${allConstraintsSlotsCount} available slots`);
    log.test("Closure further reduces available slots", allConstraintsSlotsCount < appointmentSlotsCount);
    
    // Test slots during specific time periods
    log.step(8, "Validating specific time slots");
    const slot900 = allConstraintsSlots.find(s => s.time === '09:00:00');
    const slot1200 = allConstraintsSlots.find(s => s.time === '12:00:00');
    const slot1400 = allConstraintsSlots.find(s => s.time === '14:00:00');
    
    log.debug(`9:00 AM slot: ${slot900 ? (slot900.available ? 'Available' : 'Unavailable') : 'Not found'}`);
    log.debug(`12:00 PM slot: ${slot1200 ? (slot1200.available ? 'Available' : 'Unavailable') : 'Not found'}`);
    log.debug(`2:00 PM slot: ${slot1400 ? (slot1400.available ? 'Available' : 'Unavailable') : 'Not found'}`);
    
    log.test("9:00 AM slot unavailable due to closure", slot900 && !slot900.available);
    log.test("12:00 PM slot unavailable due to break", slot1200 && !slot1200.available);
    log.test("2:00 PM slot unavailable due to appointment", slot1400 && !slot1400.available);
    
    // Clean up test data
    log.step(9, "Cleaning up test data");
    await testBreak.destroy();
    await testAppointment.destroy();
    await testClosure.destroy();
    log.success("Test data cleaned up");
    
    log.success("All tests completed successfully!");
  } catch (error) {
    log.error(`Test failed with error: ${error.message}`);
    console.error(error);
  } finally {
    await models.sequelize.close();
    log.info("Database connection closed");
  }
}

// Run the test
runTest().catch(console.error); 