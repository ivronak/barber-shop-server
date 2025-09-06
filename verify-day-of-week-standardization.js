/**
 * Script to verify day of week standardization
 */

'use strict';

// Load environment variables
require('dotenv').config();

// Import models and utils
const { sequelize, Break, BusinessHour, WorkingHour } = require('./src/models');
const dayOfWeekUtils = require('./src/utils/dayOfWeekUtils');

/**
 * Verify day of week standardization
 */
async function verifyDayOfWeekStandardization() {
  try {
    console.log('Verifying day of week standardization...');
    
    // 1. Check BusinessHour model
    const businessHours = await BusinessHour.findAll({
      order: [['day_of_week', 'ASC']]
    });
    
    console.log('\nBusiness Hours:');
    businessHours.forEach(hour => {
      console.log(`- ${hour.id}: ${hour.day_of_week} (${hour.open_time} - ${hour.close_time})`);
    });
    
    // 2. Check Break model
    const breaks = await Break.findAll({
      limit: 10,
      order: [['id', 'ASC']]
    });
    
    console.log('\nBreaks (sample):');
    breaks.forEach(breakItem => {
      console.log(`- ${breakItem.id}: "${breakItem.name}" on ${breakItem.day_of_week} (${breakItem.start_time} - ${breakItem.end_time})`);
    });
    
    // 3. Check WorkingHour model
    const workingHours = await WorkingHour.findAll({
      limit: 10,
      order: [['id', 'ASC']]
    });
    
    console.log('\nWorking Hours (sample):');
    workingHours.forEach(wh => {
      console.log(`- ${wh.id}: Staff ${wh.staff_id} on ${wh.day_of_week} (${wh.start_time} - ${wh.end_time})`);
    });
    
    // 4. Test creating breaks with string day_of_week
    console.log('\nTesting break creation with string day_of_week...');
    const testBreak = await Break.create({
      name: 'Test Break',
      day_of_week: 'monday',
      start_time: '12:00:00',
      end_time: '13:00:00'
    });
    
    console.log(`Created test break: ${testBreak.id} on ${testBreak.day_of_week}`);
    
    // Clean up
    await testBreak.destroy();
    console.log('Test break deleted');
    
    console.log('\nVerification completed successfully!');
  } catch (error) {
    console.error('Verification error:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the verification if this script is executed directly
if (require.main === module) {
  verifyDayOfWeekStandardization();
} 