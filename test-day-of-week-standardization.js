/**
 * Script to test day of week standardization for admin/slots and staff/working-hours
 */

'use strict';

// Load environment variables
require('dotenv').config();

// Import models and utils
const { sequelize, Break, BusinessHour, WorkingHour, Staff } = require('./src/models');
const dayOfWeekUtils = require('./src/utils/dayOfWeekUtils');
const { getConsistentDayOfWeek } = require('./src/utils/appointment.utils');

/**
 * Test day of week standardization
 */
async function testDayOfWeekStandardization() {
  try {
    console.log('Testing day of week standardization...');
    
    // 1. Test creating a staff break for Monday
    console.log('\n1. Creating a staff break for Monday...');
    
    // Find a staff member
    const staff = await Staff.findOne();
    if (!staff) {
      console.log('No staff found, skipping test');
      return;
    }
    
    console.log(`Found staff: ${staff.id}`);
    
    // Create a break for Monday
    const mondayBreak = await Break.create({
      staff_id: staff.id,
      day_of_week: 'monday',
      name: 'Test Monday Break',
      start_time: '12:00:00',
      end_time: '13:00:00'
    });
    
    console.log(`Created break: ${mondayBreak.id} on ${mondayBreak.day_of_week}`);
    
    // 2. Test finding breaks for Monday
    console.log('\n2. Finding breaks for Monday...');
    
    // Get Monday's numeric day (for legacy code)
    const mondayNumeric = dayOfWeekUtils.getDayNumberFromName('monday');
    console.log(`Monday's numeric day: ${mondayNumeric}`);
    
    // Find breaks for Monday using string value
    const mondayBreaks = await Break.findAll({
      where: { day_of_week: 'monday' }
    });
    
    console.log(`Found ${mondayBreaks.length} breaks for Monday using string value`);
    mondayBreaks.forEach(breakItem => {
      console.log(`- ${breakItem.id}: "${breakItem.name}" on ${breakItem.day_of_week} (${breakItem.start_time} - ${breakItem.end_time})`);
    });
    
    // 3. Test getConsistentDayOfWeek function
    console.log('\n3. Testing getConsistentDayOfWeek function...');
    
    // Create a date for next Monday
    const today = new Date();
    const daysUntilMonday = (1 + 7 - today.getDay()) % 7 || 7; // 1 is Monday, calculate days until next Monday
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    
    const mondayStr = nextMonday.toISOString().split('T')[0]; // YYYY-MM-DD
    console.log(`Next Monday: ${mondayStr}`);
    
    const { dayOfWeek, numericDayOfWeek } = getConsistentDayOfWeek(mondayStr);
    console.log(`Day of week: ${dayOfWeek}, numeric day: ${numericDayOfWeek}`);
    
    if (dayOfWeek === 'monday' && numericDayOfWeek === 1) {
      console.log('✅ getConsistentDayOfWeek returns correct values');
    } else {
      console.log('❌ getConsistentDayOfWeek returns incorrect values');
    }
    
    // Clean up
    await mondayBreak.destroy();
    console.log('\nTest break deleted');
    
    console.log('\nTests completed successfully!');
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testDayOfWeekStandardization();
} 