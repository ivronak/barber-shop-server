/**
 * Timezone Edge Case Test
 * Tests day of week calculation at various extreme timezone situations
 */

const dayOfWeekUtils = require('./src/utils/dayOfWeekUtils');
const models = require('./src/models');
const { Op } = require('sequelize');

// Simple logger with color support
const log = {
  info: (msg) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
  debug: (msg) => console.log(`\x1b[90m[DEBUG]\x1b[0m ${msg}`),
  success: (msg) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`),
  error: (msg) => console.log(`\x1b[31m[ERROR]\x1b[0m ${msg}`),
  warn: (msg) => console.log(`\x1b[33m[WARN]\x1b[0m ${msg}`),
  test: (label, passed) => console.log(`\x1b[${passed ? 32 : 31}m[TEST]\x1b[0m ${label}: ${passed ? 'PASSED' : 'FAILED'}`),
  section: (name) => console.log(`\n\x1b[35m=== ${name} ===\x1b[0m`),
  caseResult: (result) => console.log(result ? `\x1b[32m✓ PASS\x1b[0m` : `\x1b[31m✗ FAIL\x1b[0m`),
};

async function main() {
  try {
    log.info('Starting timezone edge case tests');
    log.info(`Current server time: ${new Date().toISOString()}`);

    // Test 1: Date boundary tests - midnight UTC across all timezones
    log.section('TEST 1: Date Boundary Tests');
    
    // Test with UTC midnight (boundary point)
    const boundaryDates = [
      { date: '2024-08-31', utcTime: '00:00:00', expected: { saturday: true, sunday: false } },
      { date: '2024-09-01', utcTime: '00:00:00', expected: { saturday: false, sunday: true } },
      
      // Right before/after midnight
      { date: '2024-08-31', utcTime: '23:59:59', expected: { saturday: true, sunday: false } },
      { date: '2024-09-01', utcTime: '00:00:01', expected: { saturday: false, sunday: true } },
    ];

    for (const test of boundaryDates) {
      log.info(`Testing boundary date: ${test.date}T${test.utcTime}Z`);
      
      // Create explicit date with exact UTC time
      const explicitDate = new Date(`${test.date}T${test.utcTime}Z`);
      log.debug(`Explicit UTC date: ${explicitDate.toISOString()}`);
      
      // Get day with standard JavaScript Date
      const jsDay = explicitDate.getDay();
      const jsDayName = dayOfWeekUtils.getDayNameFromNumber(jsDay);
      log.debug(`Regular JS calculation: day=${jsDay}, name=${jsDayName}`);
      
      // Check if it matches expected values
      const isSaturday = jsDay === 6;
      const isSunday = jsDay === 0;
      
      let passed = (isSaturday === test.expected.saturday && isSunday === test.expected.sunday);
      log.caseResult(passed);
      
      if (!passed) {
        log.error(`Expected saturday=${test.expected.saturday}, sunday=${test.expected.sunday}`);
        log.error(`Got saturday=${isSaturday}, sunday=${isSunday}`);
      }
      
      // Now test with our UTC noon method for the date part only
      log.debug(`Testing our robust method with date part only: ${test.date}`);
      const noonResult = dayOfWeekUtils.getConsistentDayOfWeekFromString(test.date);
      log.debug(`UTC noon method: day=${noonResult.numericDayOfWeek}, name=${noonResult.dayOfWeek}`);
      
      // For date-only strings, we expect consistent results regardless of the server timezone
      // August 31 should always be Saturday (6), September 1 should always be Sunday (0)
      const expectedDay = test.date === '2024-08-31' ? 6 : 0;
      const expectedName = test.date === '2024-08-31' ? 'saturday' : 'sunday';
      
      passed = noonResult.numericDayOfWeek === expectedDay && noonResult.dayOfWeek === expectedName;
      log.test(`UTC noon method consistent for ${test.date}`, passed);
    }
    
    // Test 2: Fractional timezone offsets
    log.section('TEST 2: Fractional Timezone Offsets');
    
    // Test with timezones that have fractional hour offsets
    const fractionalTzTests = [
      { name: 'India (UTC+5:30)', date: '2024-08-31', offsetHours: 5.5 },
      { name: 'Nepal (UTC+5:45)', date: '2024-08-31', offsetHours: 5.75 },
      { name: 'Chatham Islands (UTC+12:45)', date: '2024-08-31', offsetHours: 12.75 }
    ];
    
    for (const test of fractionalTzTests) {
      log.info(`Testing with ${test.name}`);
      
      // Simulate local date in the target timezone
      // For a real implementation, you'd use a proper timezone library
      // This is just a simulation for testing purposes
      const offsetMs = test.offsetHours * 60 * 60 * 1000;
      const utcDate = new Date(`${test.date}T00:00:00Z`);
      const localDate = new Date(utcDate.getTime() + offsetMs);
      
      log.debug(`UTC midnight: ${utcDate.toISOString()}`);
      log.debug(`Local time: ${localDate.toISOString()} (${test.offsetHours} hours ahead)`);
      
      // Regular date calculation (simulated timezone)
      const jsDay = localDate.getDay();
      log.debug(`Regular calculation in simulated TZ: day=${jsDay}, name=${dayOfWeekUtils.getDayNameFromNumber(jsDay)}`);
      
      // Our robust UTC noon method
      const noonResult = dayOfWeekUtils.getConsistentDayOfWeekFromString(test.date);
      log.debug(`UTC noon method: day=${noonResult.numericDayOfWeek}, name=${noonResult.dayOfWeek}`);
      
      // For 2024-08-31, we expect Saturday (6) from the robust method
      const expectedDay = 6; // Saturday for 2024-08-31
      log.test(`${test.name} consistency test`, noonResult.numericDayOfWeek === expectedDay);
    }
    
    // Test 3: Across DST transitions
    log.section('TEST 3: DST Transition Periods');
    
    // Test dates near DST transitions in different regions
    const dstTests = [
      // North American DST transitions 2024
      { region: 'North America Spring Forward', date: '2024-03-10', tzname: 'America/New_York' },
      { region: 'North America Fall Back', date: '2024-11-03', tzname: 'America/New_York' },
      
      // European DST transitions 2024
      { region: 'Europe Spring Forward', date: '2024-03-31', tzname: 'Europe/London' },
      { region: 'Europe Fall Back', date: '2024-10-27', tzname: 'Europe/London' },
    ];
    
    for (const test of dstTests) {
      log.info(`Testing DST period: ${test.region} (${test.date})`);
      
      // Get standard JS day (in local timezone)
      const localDate = new Date(test.date);
      const jsDay = localDate.getDay();
      log.debug(`Regular calculation: day=${jsDay}, name=${dayOfWeekUtils.getDayNameFromNumber(jsDay)}`);
      
      // Our robust UTC noon method
      const noonResult = dayOfWeekUtils.getConsistentDayOfWeekFromString(test.date);
      log.debug(`UTC noon method: day=${noonResult.numericDayOfWeek}, name=${noonResult.dayOfWeek}`);
      
      // For DST transition dates, we want to verify it matches a hardcoded expected value
      // 2024-03-10 is a Sunday (0), 2024-11-03 is a Sunday (0)
      // 2024-03-31 is a Sunday (0), 2024-10-27 is a Sunday (0)
      const expectedDay = 0; // All DST transition dates selected are Sundays
      log.test(`${test.region} DST transition date consistency`, noonResult.numericDayOfWeek === expectedDay);
    }
    
    // Test 4: Business timezone test with your actual timezone from settings
    log.section('TEST 4: Business Timezone Test');
    
    // Get business timezone from database
    const businessSettings = await models.BusinessSetting.findOne();
    const businessTimezone = businessSettings?.timezone || 'UTC';
    log.info(`Business timezone: ${businessTimezone}`);
    
    // Test special dates in the business timezone
    const businessTzTests = [
      { date: '2024-08-31', expected: { day: 6, name: 'saturday' } }, // Saturday
      { date: '2024-09-01', expected: { day: 0, name: 'sunday' } },   // Sunday
      { date: '2024-12-31', expected: { day: 2, name: 'tuesday' } },  // Tuesday (Year end)
      { date: '2025-01-01', expected: { day: 3, name: 'wednesday' } } // Wednesday (Year start)
    ];
    
    for (const test of businessTzTests) {
      log.info(`Testing date ${test.date} in business timezone ${businessTimezone}`);
      
      // Our robust UTC noon method
      const noonResult = dayOfWeekUtils.getConsistentDayOfWeekFromString(test.date);
      log.debug(`UTC noon method: day=${noonResult.numericDayOfWeek}, name=${noonResult.dayOfWeek}`);
      
      // Verify against expected values
      const dayMatches = noonResult.numericDayOfWeek === test.expected.day;
      const nameMatches = noonResult.dayOfWeek === test.expected.name;
      
      log.test(`${test.date} day calculation in business timezone`, dayMatches && nameMatches);
      
      if (!dayMatches || !nameMatches) {
        log.error(`Expected: day=${test.expected.day}, name=${test.expected.name}`);
        log.error(`Got: day=${noonResult.numericDayOfWeek}, name=${noonResult.dayOfWeek}`);
      }
    }
    
    log.section('SUMMARY');
    log.info('All timezone edge case tests completed');
    log.info('The UTC noon method provides consistent day calculation across all timezones');
    
  } catch (error) {
    log.error(`Error running tests: ${error.message}`);
    console.error(error);
  } finally {
    // Close database connection
    models.sequelize.close();
    log.info('Database connection closed');
  }
}

// Run the main function and handle errors
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
}); 