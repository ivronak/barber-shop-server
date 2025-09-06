const { 
  Appointment, 
  WorkingHour, 
  ShopClosure, 
  BusinessHour 
} = require('../models');
const { Op } = require('sequelize');
const dayOfWeekUtils = require('./dayOfWeekUtils');

/**
 * Helper function to get consistent day of week values
 * @param {string|Date} date - Date string in YYYY-MM-DD format or Date object
 * @param {string} timezone - Optional timezone (default: process.env.TZ || 'UTC')
 * @returns {Object} - Object with dayOfWeek (string) and numericDayOfWeek (number)
 */
function getConsistentDayOfWeek(date, timezone = process.env.TZ || 'UTC') {
  
  
  
  // Compare the two methods of calculation for debugging
  
  // Method 1: Original method (potentially inconsistent with timezone issues)
  const dateObj = date instanceof Date ? date : new Date(date);
  
  
  const originalNumericDay = dateObj.getDay();
  const originalDayName = dayOfWeekUtils.getDayNameFromNumber(originalNumericDay);
  
  
  // Method 2: New robust method using noon UTC
  const robustResult = dayOfWeekUtils.getConsistentDayOfWeekFromString(date, timezone);
  
  
  // Check if there's a difference between the methods
  if (originalNumericDay !== robustResult.numericDayOfWeek) {
    
    
    
    
  }
  
  // Return the robust result to ensure consistency
  return robustResult;
}

/**
 * Helper function to convert time between timezones
 * @param {string} timeString - Time string in HH:MM or HH:MM:SS format
 * @param {string} date - Date string in YYYY-MM-DD format
 * @param {string} sourceTimezone - Source timezone (e.g., 'America/New_York')
 * @param {string} targetTimezone - Target timezone (e.g., 'UTC')
 * @returns {string} - Converted time string in HH:MM:SS format
 */
function convertTimezone(timeString, date, sourceTimezone, targetTimezone) {
  // Standardize time format
  const standardizedTime = standardizeTimeFormat(timeString);
  
  
  
  try {
    // Create a Date object with the standardized time
    const dateObj = new Date(`${date}T${standardizedTime}`);
    
    
    // For simplicity, we'll use the built-in Date methods
    // In a production environment, consider using a library like date-fns-tz
    
    // Get the timezone offsets in minutes
    const sourceOffset = new Date().getTimezoneOffset();
    
    
    // Convert to target timezone
    let targetTime;
    if (targetTimezone === 'UTC') {
      // Convert to UTC
      const utcHours = dateObj.getUTCHours();
      const utcMinutes = dateObj.getUTCMinutes();
      const utcSeconds = dateObj.getUTCSeconds();
      targetTime = `${utcHours.toString().padStart(2, '0')}:${utcMinutes.toString().padStart(2, '0')}:${utcSeconds.toString().padStart(2, '0')}`;
    } else {
      // Convert from UTC to local
      const localHours = dateObj.getHours();
      const localMinutes = dateObj.getMinutes();
      const localSeconds = dateObj.getSeconds();
      targetTime = `${localHours.toString().padStart(2, '0')}:${localMinutes.toString().padStart(2, '0')}:${localSeconds.toString().padStart(2, '0')}`;
    }
    
    
    return targetTime;
  } catch (error) {
    console.error('Error converting timezone:', error);
    return standardizedTime; // Return original time if conversion fails
  }
}

/**
 * Helper function to standardize time format for comparison
 * @param {string} timeString - Time string in any format (HH:MM:SS or HH:MM)
 * @returns {string} - Time string in HH:MM:SS format
 */
function standardizeTimeFormat(timeString) {
  if (!timeString) return null;
  
  // If the time already has seconds, return it
  if (timeString.split(':').length === 3) return timeString;
  
  // Otherwise add seconds
  return `${timeString}:00`;
}

/**
 * Helper function to check if a time slot is available
 */
async function checkAvailability(staffId, date, startTime, endTime, excludeAppointmentId = null) {
  // Standardize time formats
  startTime = standardizeTimeFormat(startTime);
  endTime = standardizeTimeFormat(endTime);
  
  
  
  // Check business hours
  const { dayOfWeek, numericDayOfWeek } = getConsistentDayOfWeek(date);
  
  
  const businessHours = await BusinessHour.findOne({
    where: { day_of_week: dayOfWeek }
  });
  
  if (!businessHours || !businessHours.open_time || !businessHours.close_time) {
    
    return false; // Shop is closed on this day
  }
  
  // Standardize business hours time format
  const businessOpenTime = standardizeTimeFormat(businessHours.open_time);
  const businessCloseTime = standardizeTimeFormat(businessHours.close_time);
  
  
  
  if (startTime < businessOpenTime || endTime > businessCloseTime) {
    
    return false; // Outside business hours
  }
  
  // Check if shop is closed on the date
  const shopClosure = await ShopClosure.findOne({
    where: { date, is_full_day: true }
  });
  
  if (shopClosure) {
    
    return false; // Shop is closed all day
  }
  
  // Check partial shop closures
  const partialClosures = await ShopClosure.findAll({
    where: { date, is_full_day: false }
  });
  
  
  
  for (const closure of partialClosures) {
    const closureStart = standardizeTimeFormat(closure.start_time);
    const closureEnd = standardizeTimeFormat(closure.end_time);
    
    
    if (
      (startTime >= closureStart && startTime < closureEnd) ||
      (endTime > closureStart && endTime <= closureEnd) ||
      (startTime <= closureStart && endTime >= closureEnd)
    ) {
      
      return false; // Overlaps with partial closure
    }
  }
  
  // Get business settings for timezone and slot duration
  const businessSettings = await require('../models').BusinessSetting.findOne();
  const timezone = businessSettings ? businessSettings.timezone : 'UTC';
  const slotDuration = businessSettings ? businessSettings.slot_duration : 30;
  
  
  
  // Check for admin-defined breaks in the Break model
  const businessHour = await BusinessHour.findOne({
    where: { day_of_week: dayOfWeek }
  });
  
  let adminBreaks = [];
  if (businessHour) {
    // Get admin breaks specifically for this business hour and day
    adminBreaks = await require('../models').Break.findAll({
      where: {
        business_hour_id: businessHour.id,
        staff_id: null,
        day_of_week: dayOfWeek
      }
    });
    
    
    
    // Log each break for debugging
    adminBreaks.forEach(breakItem => {
      
    });
  }
  
  // Check all admin breaks
  for (const breakTime of adminBreaks) {
    const breakStart = standardizeTimeFormat(breakTime.start_time);
    const breakEnd = standardizeTimeFormat(breakTime.end_time);
    
    
    if (
      (startTime >= breakStart && startTime < breakEnd) ||
      (endTime > breakStart && endTime <= breakEnd) ||
      (startTime <= breakStart && endTime >= breakEnd)
    ) {
      
      return false; // Overlaps with break
    }
  }
  
  // Check existing appointments
  const whereClause = {
    date,
    status: {
      [Op.notIn]: ['cancelled', 'no-show']
    }
  };
  
  if (staffId) {
    whereClause.staff_id = staffId;
  }
  
  if (excludeAppointmentId) {
    whereClause.id = { [Op.ne]: excludeAppointmentId };
  }
  
  const existingAppointments = await Appointment.findAll({
    where: whereClause,
    attributes: ['time', 'end_time']
  });
  
  
  
  for (const appointment of existingAppointments) {
    const appointmentStart = standardizeTimeFormat(appointment.time);
    const appointmentEnd = standardizeTimeFormat(appointment.end_time);
    
    
    if (
      (startTime >= appointmentStart && startTime < appointmentEnd) ||
      (endTime > appointmentStart && endTime <= appointmentEnd) ||
      (startTime <= appointmentStart && endTime >= appointmentEnd)
    ) {
      
      return false; // Overlaps with existing appointment
    }
  }
  
  
  return true; // Time slot is available
}

/**
 * Helper function to format time in 12-hour format
 * @param {string} timeString - Time string in HH:MM:SS format
 * @returns {string} - Time string in h:mm a format
 */
function formatTo12Hour(timeString) {
  try {
    const [hours, minutes] = timeString.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12; // Convert 0 to 12 for 12 AM
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
  } catch (error) {
    console.error('Error formatting time to 12-hour:', error);
    return timeString;
  }
}

/**
 * Helper function to generate time slots
 */
function generateTimeSlots(
  businessOpenTime, 
  businessCloseTime, 
  slotDuration, 
  serviceDuration,
  staffWorkingHours,
  breaks,
  existingAppointments,
  partialClosures,
  date = null,
  timezone = null
) {
  
  
  
  // Initialize array to hold all slots
  const slots = [];
  
  // Convert time strings to minutes for easier calculation
  const businessOpen = convertTimeToMinutes(businessOpenTime);
  const businessClose = convertTimeToMinutes(businessCloseTime);
  
  
  
  
  // Get consistent day of week values for the requested date
  let requestedDayOfWeek = null;
  let numericDayOfWeek = null;
  
  if (date) {
    const dayInfo = getConsistentDayOfWeek(date);
    requestedDayOfWeek = dayInfo.dayOfWeek;
    numericDayOfWeek = dayInfo.numericDayOfWeek;
    
  }
  
  // Filter and validate breaks
  
  const validBreaks = Array.isArray(breaks) ? breaks.filter(breakItem => {
    // Skip breaks without required properties
    if (!breakItem || !breakItem.start_time || !breakItem.end_time) {
      
      return false;
    }
    
    // If break has a specified day_of_week, it must match the requested day
    if (breakItem.day_of_week !== null && breakItem.day_of_week !== undefined) {
      const breakDay = breakItem.day_of_week.toLowerCase();
      const breakDayMatches = breakDay === requestedDayOfWeek;
      if (!breakDayMatches) {
        
        
        return false;
      }
    }
    
    
    // The break is valid
    return true;
  }) : [];
  
  
  
  // Process staff working hours
  
  const validWorkingHours = Array.isArray(staffWorkingHours) ? staffWorkingHours.filter(workingHour => {
    // Skip working hours without required properties
    if (!workingHour || !workingHour.start_time || !workingHour.end_time) {
      
      return false;
    }
    
    // If working hour has a specified day_of_week, it must match the requested day
    if (workingHour.day_of_week !== null && workingHour.day_of_week !== undefined) {
      const workingDay = workingHour.day_of_week.toLowerCase();
      const dayMatches = workingDay === requestedDayOfWeek;
      if (!dayMatches) {
        
        
        return false;
      }
    }
    
    
    // The working hour is valid
    return true;
  }) : [];
  
  
  
  // Calculate how many slots we'll generate
  const totalMinutes = businessClose - businessOpen;
  const estimatedSlots = Math.floor(totalMinutes / slotDuration);
  
  
  // Debug existing appointments
  if (existingAppointments && existingAppointments.length > 0) {
    
    existingAppointments.forEach((appt, i) => {
      
    });
  }
  
  // Debug partial closures
  if (partialClosures && partialClosures.length > 0) {
    
    partialClosures.forEach((closure, i) => {
      
    });
  }
  
  let countAvailable = 0;
  let countUnavailable = 0;
  let countBreakOverlap = 0;
  let countAppointmentOverlap = 0;
  let countClosureOverlap = 0;
  let countOutsideWorkingHours = 0;
  let countPastTime = 0; // New counter for past-time slots
  
  // Generate all possible slots within business hours
  
  for (let time = businessOpen; time <= businessClose - serviceDuration; time += slotDuration) {
    const slotStart = convertMinutesToTime(time);
    const slotEnd = convertMinutesToTime(time + serviceDuration);
    
    // Debug every 5th slot to avoid excessive logging
    const debugThisSlot = (slots.length % 5 === 0);
    if (debugThisSlot) {
      
    }
    
    // Default to available
    let isAvailable = true;
    let unavailableReason = '';
    
    // Step -1: Mark slots in the past (only when date is today)
    if (isAvailable && date) {
      // Determine "today" and current time in the requested timezone (or default UTC)
      const tz = timezone || 'UTC';
      const now = new Date();

      // Use Intl.DateTimeFormat to get date/time components in the desired timezone
      const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });

      const parts = formatter.formatToParts(now);
      let year, month, day, hour, minute;
      for (const p of parts) {
        switch (p.type) {
          case 'year':   year = p.value; break;
          case 'month':  month = p.value; break;
          case 'day':    day = p.value; break;
          case 'hour':   hour = p.value; break;
          case 'minute': minute = p.value; break;
          default: break;
        }
      }

      const todayStr = `${year}-${month}-${day}`;
      const currentMinutes = parseInt(hour, 10) * 60 + parseInt(minute, 10);

      if (date === todayStr && time < currentMinutes) {
        isAvailable = false;
        unavailableReason = 'Past time';
        countPastTime++;
        if (debugThisSlot) {
          
        }
      }
    }
    
    // Step 0: Check if slot is within staff working hours
    if (isAvailable && validWorkingHours.length > 0) {
      // Default to unavailable until we find a matching working hour
      let isWithinWorkingHours = false;
      
      for (const workingHour of validWorkingHours) {
        const workStart = convertTimeToMinutes(workingHour.start_time);
        const workEnd = convertTimeToMinutes(workingHour.end_time);
        
        // Check if slot is completely within this working hour
        if (time >= workStart && time + serviceDuration <= workEnd) {
          isWithinWorkingHours = true;
          if (debugThisSlot) {
            
          }
          break;
        }
      }
      
      // If not within any working hour, mark as unavailable
      if (!isWithinWorkingHours) {
        isAvailable = false;
        unavailableReason = 'Outside staff working hours';
        countOutsideWorkingHours++;
        if (debugThisSlot) {
          
        }
      }
    }
    
    // Step 1: Check if slot overlaps with any applicable breaks
    if (isAvailable && validBreaks.length > 0) {
      for (const breakItem of validBreaks) {
        const breakStart = convertTimeToMinutes(breakItem.start_time);
        const breakEnd = convertTimeToMinutes(breakItem.end_time);
        
        // Check for any overlap between slot time and break time
        if (
          (time >= breakStart && time < breakEnd) || // Slot starts during break
          (time + serviceDuration > breakStart && time + serviceDuration <= breakEnd) || // Slot ends during break
          (time <= breakStart && time + serviceDuration >= breakEnd) // Slot completely covers break
        ) {
          isAvailable = false;
          unavailableReason = breakItem.name ? `Break: ${breakItem.name}` : 'Break time';
          countBreakOverlap++;
          if (debugThisSlot) {
            
          }
          break;
        }
      }
    }
    
    // Step 2: Check if slot overlaps with existing appointments
    if (isAvailable && existingAppointments && existingAppointments.length > 0) {
      for (const appointment of existingAppointments) {
        const appointmentStart = convertTimeToMinutes(appointment.time);
        const appointmentEnd = convertTimeToMinutes(appointment.end_time);
        
        if (
          (time >= appointmentStart && time < appointmentEnd) ||
          (time + serviceDuration > appointmentStart && time + serviceDuration <= appointmentEnd) ||
          (time <= appointmentStart && time + serviceDuration >= appointmentEnd)
        ) {
          isAvailable = false;
          unavailableReason = 'Already booked';
          countAppointmentOverlap++;
          if (debugThisSlot) {
            
          }
          break;
        }
      }
    }
    
    // Step 3: Check if slot overlaps with partial closures
    if (isAvailable && partialClosures && partialClosures.length > 0) {
      for (const closure of partialClosures) {
        const closureStart = convertTimeToMinutes(closure.start_time);
        const closureEnd = convertTimeToMinutes(closure.end_time);
        
        if (
          (time >= closureStart && time < closureEnd) ||
          (time + serviceDuration > closureStart && time + serviceDuration <= closureEnd) ||
          (time <= closureStart && time + serviceDuration >= closureEnd)
        ) {
          isAvailable = false;
          unavailableReason = `Shop closed: ${closure.reason || 'Temporary closure'}`;
          countClosureOverlap++;
          if (debugThisSlot) {
            
          }
          break;
        }
      }
    }
    
    // Add slot regardless of availability
    const slot = {
      time: slotStart,
      end_time: slotEnd,
      available: isAvailable,
      unavailableReason: isAvailable ? null : unavailableReason
    };

    // Add timezone information if provided
    if (date && timezone) {
      slot.timezone = timezone;
      
      // Include formatted time in 12-hour format for display
      slot.displayTime = formatTo12Hour(slotStart);
      slot.displayEndTime = formatTo12Hour(slotEnd);
    }
    
    // Count availability
    if (isAvailable) {
      countAvailable++;
      if (debugThisSlot) {
        
      }
    } else {
      countUnavailable++;
    }
    
    slots.push(slot);
  }
  
  
  
  
  if (countAvailable > 0) {
    const firstAvailable = slots.find(s => s.available);
    
  }
  
  
  return slots;
}

/**
 * Helper function to convert time string to minutes
 */
function convertTimeToMinutes(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Helper function to convert minutes to time string
 */
function convertMinutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;
}

module.exports = {
  checkAvailability,
  generateTimeSlots,
  convertTimeToMinutes,
  convertMinutesToTime,
  convertTimezone,
  formatTo12Hour,
  standardizeTimeFormat,
  getConsistentDayOfWeek
}; 