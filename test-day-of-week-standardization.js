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
    
    
    // 1. Test creating a staff break for Monday
    
    
    // Find a staff member
    const staff = await Staff.findOne();
    if (!staff) {
      
      return;
    }
    
    
    
    // Create a break for Monday
    const mondayBreak = await Break.create({
      staff_id: staff.id,
      day_of_week: 'monday',
      name: 'Test Monday Break',
      start_time: '12:00:00',
      end_time: '13:00:00'
    });
    
    
    
    // 2. Test finding breaks for Monday
    
    
    // Get Monday's numeric day (for legacy code)
    const mondayNumeric = dayOfWeekUtils.getDayNumberFromName('monday');
    
    
    // Find breaks for Monday using string value
    const mondayBreaks = await Break.findAll({
      where: { day_of_week: 'monday' }
    });
    
    
    mondayBreaks.forEach(breakItem => {
      
    });
    
    // 3. Test getConsistentDayOfWeek function
    
    
    // Create a date for next Monday
    const today = new Date();
    const daysUntilMonday = (1 + 7 - today.getDay()) % 7 || 7; // 1 is Monday, calculate days until next Monday
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    
    const mondayStr = nextMonday.toISOString().split('T')[0]; // YYYY-MM-DD
    
    
    const { dayOfWeek, numericDayOfWeek } = getConsistentDayOfWeek(mondayStr);
    
    
    if (dayOfWeek === 'monday' && numericDayOfWeek === 1) {
      
    } else {
      
    }
    
    // Clean up
    await mondayBreak.destroy();
    
    
    
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