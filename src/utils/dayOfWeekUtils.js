/**
 * Utility functions for working with days of the week
 */

const moment = require('moment-timezone');

// Standard array of day names in order (Sunday first)
const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * Convert a JavaScript Date object to a day of week string
 * @param {Date} date - The date object
 * @returns {string} The day name (e.g., 'monday')
 */
const getDayNameFromDate = (date) => {
  
  
  
  return DAYS_OF_WEEK[date.getDay()];
};

/**
 * Convert a day of week string to numeric index (0-6)
 * @param {string} dayName - The day name (e.g., 'monday')
 * @returns {number} The day index (0 for sunday, 1 for monday, etc.)
 */
const getDayNumberFromName = (dayName) => {
  
  if (!dayName) return -1;
  const result = DAYS_OF_WEEK.indexOf(dayName.toLowerCase());
  
  return result;
};

/**
 * Convert a numeric day index to day name
 * @param {number} dayNumber - The day number (0-6)
 * @returns {string} The day name
 */
const getDayNameFromNumber = (dayNumber) => {
  
  if (dayNumber < 0 || dayNumber > 6) {
    
    return null;
  }
  const result = DAYS_OF_WEEK[dayNumber];
  
  return result;
};

/**
 * Get all days of week as an array of strings
 * @returns {Array<string>} Array of day names
 */
const getAllDays = () => {
  return [...DAYS_OF_WEEK];
};

/**
 * Get the next day of the week
 * @param {string} dayName - Current day name
 * @returns {string} Next day name
 */
const getNextDay = (dayName) => {
  const dayNumber = getDayNumberFromName(dayName);
  if (dayNumber === -1) return null;
  
  const nextDayNumber = (dayNumber + 1) % 7;
  return DAYS_OF_WEEK[nextDayNumber];
};

/**
 * Get the previous day of the week
 * @param {string} dayName - Current day name
 * @returns {string} Previous day name
 */
const getPreviousDay = (dayName) => {
  const dayNumber = getDayNumberFromName(dayName);
  if (dayNumber === -1) return null;
  
  const prevDayNumber = (dayNumber + 6) % 7; // Adding 6 is equivalent to subtracting 1 in modulo 7
  return DAYS_OF_WEEK[prevDayNumber];
};

/**
 * Get the day of week from a date string in YYYY-MM-DD format, accounting for timezone issues
 * @param {string} dateString - The date string in YYYY-MM-DD format
 * @param {string} timezone - The timezone to use for the date calculation
 * @returns {Object} Object containing day name and number
 */
const getConsistentDayOfWeekFromString = (dateString, timezone = 'UTC') => {
  
  
  // Ensure we're working with a clean YYYY-MM-DD format
  let cleanDateString = dateString;
  if (dateString instanceof Date) {
    cleanDateString = dateString.toISOString().split('T')[0];
    
  }
  
  // Use moment-timezone at noon in specified timezone for accuracy
  const date = moment.tz(`${cleanDateString} 12:00`, timezone).toDate();
  
  
  const numericDayOfWeek = date.getDay();
  const dayOfWeek = DAYS_OF_WEEK[numericDayOfWeek];
  
  
  
  return { dayOfWeek, numericDayOfWeek };
};

module.exports = {
  DAYS_OF_WEEK,
  getDayNameFromDate,
  getDayNumberFromName,
  getDayNameFromNumber,
  getAllDays,
  getNextDay,
  getPreviousDay,
  getConsistentDayOfWeekFromString
}; 