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
    
    
    // 1. Check BusinessHour model
    const businessHours = await BusinessHour.findAll({
      order: [['day_of_week', 'ASC']]
    });
    
    
    businessHours.forEach(hour => {
      
    });
    
    // 2. Check Break model
    const breaks = await Break.findAll({
      limit: 10,
      order: [['id', 'ASC']]
    });
    
    
    breaks.forEach(breakItem => {
      
    });
    
    // 3. Check WorkingHour model
    const workingHours = await WorkingHour.findAll({
      limit: 10,
      order: [['id', 'ASC']]
    });
    
    
    workingHours.forEach(wh => {
      
    });
    
    // 4. Test creating breaks with string day_of_week
    
    const testBreak = await Break.create({
      name: 'Test Break',
      day_of_week: 'monday',
      start_time: '12:00:00',
      end_time: '13:00:00'
    });
    
    
    
    // Clean up
    await testBreak.destroy();
    
    
    
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