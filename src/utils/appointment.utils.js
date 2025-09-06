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
  console.log(`[DAY-DEBUG] getConsistentDayOfWeek called with date: ${date}`);
  console.log(`[DAY-DEBUG] date type: ${typeof date}`);
  
  // Compare the two methods of calculation for debugging
  
  // Method 1: Original method (potentially inconsistent with timezone issues)
  const dateObj = date instanceof Date ? date : new Date(date);
  console.log(`[DAY-DEBUG] Original method date object: ${dateObj}`);
  console.log(`[DAY-DEBUG] Date object toString: ${dateObj.toString()}`);
  const originalNumericDay = dateObj.getDay();
  const originalDayName = dayOfWeekUtils.getDayNameFromNumber(originalNumericDay);
  console.log(`[DAY-DEBUG] Original method results: day=${originalNumericDay}, name=${originalDayName}`);
  
  // Method 2: New robust method using noon UTC
  const robustResult = dayOfWeekUtils.getConsistentDayOfWeekFromString(date, timezone);
  console.log(`[DAY-DEBUG] Robust method results: day=${robustResult.numericDayOfWeek}, name=${robustResult.dayOfWeek}`);
  
  // Check if there's a difference between the methods
  if (originalNumericDay !== robustResult.numericDayOfWeek) {
    console.log(`[DAY-DEBUG] WARNING! Day calculation difference detected!`);
    console.log(`[DAY-DEBUG] Original method: ${originalNumericDay} (${originalDayName})`);
    console.log(`[DAY-DEBUG] Robust method: ${robustResult.numericDayOfWeek} (${robustResult.dayOfWeek})`);
    console.log(`[DAY-DEBUG] Using the ROBUST method to ensure consistency`);
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
  
  console.log(`Converting time: ${standardizedTime} from ${sourceTimezone} to ${targetTimezone} on ${date}`);
  
  try {
    // Create a Date object with the standardized time
    const dateObj = new Date(`${date}T${standardizedTime}`);
    console.log('Original date object:', dateObj.toString());
    
    // For simplicity, we'll use the built-in Date methods
    // In a production environment, consider using a library like date-fns-tz
    
    // Get the timezone offsets in minutes
    const sourceOffset = new Date().getTimezoneOffset();
    console.log('Source offset:', sourceOffset);
    
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
    
    console.log('Converted time:', targetTime);
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
  
  console.log('Checking availability for:', { date, startTime, endTime });
  
  // Check business hours
  const { dayOfWeek, numericDayOfWeek } = getConsistentDayOfWeek(date);
  console.log('Day of week:', dayOfWeek, 'Numeric day:', numericDayOfWeek);
  
  const businessHours = await BusinessHour.findOne({
    where: { day_of_week: dayOfWeek }
  });
  
  if (!businessHours || !businessHours.open_time || !businessHours.close_time) {
    console.log('Shop is closed on this day (no business hours)');
    return false; // Shop is closed on this day
  }
  
  // Standardize business hours time format
  const businessOpenTime = standardizeTimeFormat(businessHours.open_time);
  const businessCloseTime = standardizeTimeFormat(businessHours.close_time);
  
  console.log('Business hours:', { open: businessOpenTime, close: businessCloseTime });
  
  if (startTime < businessOpenTime || endTime > businessCloseTime) {
    console.log('Time is outside business hours');
    return false; // Outside business hours
  }
  
  // Check if shop is closed on the date
  const shopClosure = await ShopClosure.findOne({
    where: { date, is_full_day: true }
  });
  
  if (shopClosure) {
    console.log('Shop is closed all day');
    return false; // Shop is closed all day
  }
  
  // Check partial shop closures
  const partialClosures = await ShopClosure.findAll({
    where: { date, is_full_day: false }
  });
  
  console.log('Partial closures count:', partialClosures.length);
  
  for (const closure of partialClosures) {
    const closureStart = standardizeTimeFormat(closure.start_time);
    const closureEnd = standardizeTimeFormat(closure.end_time);
    
    console.log('Checking partial closure:', { start: closureStart, end: closureEnd });
    if (
      (startTime >= closureStart && startTime < closureEnd) ||
      (endTime > closureStart && endTime <= closureEnd) ||
      (startTime <= closureStart && endTime >= closureEnd)
    ) {
      console.log('Overlaps with partial closure');
      return false; // Overlaps with partial closure
    }
  }
  
  // Get business settings for timezone and slot duration
  const businessSettings = await require('../models').BusinessSetting.findOne();
  const timezone = businessSettings ? businessSettings.timezone : 'UTC';
  const slotDuration = businessSettings ? businessSettings.slot_duration : 30;
  
  console.log('Business settings:', { timezone, slotDuration });
  
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
    
    console.log(`Found ${adminBreaks.length} admin breaks for business hour ${businessHour.id} on day ${dayOfWeek}`);
    
    // Log each break for debugging
    adminBreaks.forEach(breakItem => {
      console.log(`Break ID: ${breakItem.id}, Name: ${breakItem.name}, Time: ${breakItem.start_time}-${breakItem.end_time}, Day: ${breakItem.day_of_week}, Business Hour: ${breakItem.business_hour_id}`);
    });
  }
  
  // Check all admin breaks
  for (const breakTime of adminBreaks) {
    const breakStart = standardizeTimeFormat(breakTime.start_time);
    const breakEnd = standardizeTimeFormat(breakTime.end_time);
    
    console.log('Checking break:', { start: breakStart, end: breakEnd });
    if (
      (startTime >= breakStart && startTime < breakEnd) ||
      (endTime > breakStart && endTime <= breakEnd) ||
      (startTime <= breakStart && endTime >= breakEnd)
    ) {
      console.log('Overlaps with break');
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
  
  console.log('Existing appointments count:', existingAppointments.length);
  
  for (const appointment of existingAppointments) {
    const appointmentStart = standardizeTimeFormat(appointment.time);
    const appointmentEnd = standardizeTimeFormat(appointment.end_time);
    
    console.log('Checking appointment:', { start: appointmentStart, end: appointmentEnd });
    if (
      (startTime >= appointmentStart && startTime < appointmentEnd) ||
      (endTime > appointmentStart && endTime <= appointmentEnd) ||
      (startTime <= appointmentStart && endTime >= appointmentEnd)
    ) {
      console.log('Overlaps with existing appointment');
      return false; // Overlaps with existing appointment
    }
  }
  
  console.log('Time slot is available');
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
  console.log(`[GEN-SLOTS] ========== STARTING SLOT GENERATION ==========`);
  console.log(`[GEN-SLOTS] Params: open=${businessOpenTime}, close=${businessCloseTime}, slotDuration=${slotDuration}, serviceDuration=${serviceDuration}`);
  
  // Initialize array to hold all slots
  const slots = [];
  
  // Convert time strings to minutes for easier calculation
  const businessOpen = convertTimeToMinutes(businessOpenTime);
  const businessClose = convertTimeToMinutes(businessCloseTime);
  
  console.log(`[GEN-SLOTS] Business hours in minutes: open=${businessOpen}, close=${businessClose}`);
  console.log(`[GEN-SLOTS] Generating slots between ${businessOpenTime} and ${businessCloseTime} (${slotDuration} min slots, ${serviceDuration} min service)`);
  
  // Get consistent day of week values for the requested date
  let requestedDayOfWeek = null;
  let numericDayOfWeek = null;
  
  if (date) {
    const dayInfo = getConsistentDayOfWeek(date);
    requestedDayOfWeek = dayInfo.dayOfWeek;
    numericDayOfWeek = dayInfo.numericDayOfWeek;
    console.log(`[GEN-SLOTS] Date info: ${date}, day=${requestedDayOfWeek}, numericDay=${numericDayOfWeek}`);
  }
  
  // Filter and validate breaks
  console.log(`[GEN-SLOTS] Processing ${breaks.length} breaks`);
  const validBreaks = Array.isArray(breaks) ? breaks.filter(breakItem => {
    // Skip breaks without required properties
    if (!breakItem || !breakItem.start_time || !breakItem.end_time) {
      console.log(`[GEN-SLOTS] Skipping invalid break - missing required properties`);
      return false;
    }
    
    // If break has a specified day_of_week, it must match the requested day
    if (breakItem.day_of_week !== null && breakItem.day_of_week !== undefined) {
      const breakDay = breakItem.day_of_week.toLowerCase();
      const breakDayMatches = breakDay === requestedDayOfWeek;
      if (!breakDayMatches) {
        console.log(`[GEN-SLOTS] Skipping break ID=${breakItem.id || 'unknown'} (${breakItem.name || 'unnamed'})`);
        console.log(`[GEN-SLOTS] Break day "${breakDay}" doesn't match requested day "${requestedDayOfWeek}"`);
        return false;
      }
    }
    
    console.log(`[GEN-SLOTS] Including break ID=${breakItem.id || 'unknown'}: ${breakItem.start_time}-${breakItem.end_time}`);
    // The break is valid
    return true;
  }) : [];
  
  console.log(`[GEN-SLOTS] After filtering: ${validBreaks.length} valid breaks`);
  
  // Process staff working hours
  console.log(`[GEN-SLOTS] Processing ${staffWorkingHours.length} staff working hours`);
  const validWorkingHours = Array.isArray(staffWorkingHours) ? staffWorkingHours.filter(workingHour => {
    // Skip working hours without required properties
    if (!workingHour || !workingHour.start_time || !workingHour.end_time) {
      console.log(`[GEN-SLOTS] Skipping invalid working hour - missing required properties`);
      return false;
    }
    
    // If working hour has a specified day_of_week, it must match the requested day
    if (workingHour.day_of_week !== null && workingHour.day_of_week !== undefined) {
      const workingDay = workingHour.day_of_week.toLowerCase();
      const dayMatches = workingDay === requestedDayOfWeek;
      if (!dayMatches) {
        console.log(`[GEN-SLOTS] Skipping working hour ID=${workingHour.id || 'unknown'}`);
        console.log(`[GEN-SLOTS] Working hour day "${workingDay}" doesn't match requested day "${requestedDayOfWeek}"`);
        return false;
      }
    }
    
    console.log(`[GEN-SLOTS] Including working hour ID=${workingHour.id || 'unknown'}: ${workingHour.start_time}-${workingHour.end_time}`);
    // The working hour is valid
    return true;
  }) : [];
  
  console.log(`[GEN-SLOTS] After filtering: ${validWorkingHours.length} valid working hours`);
  
  // Calculate how many slots we'll generate
  const totalMinutes = businessClose - businessOpen;
  const estimatedSlots = Math.floor(totalMinutes / slotDuration);
  console.log(`[GEN-SLOTS] Estimating ${estimatedSlots} total slots over ${totalMinutes} minutes`);
  
  // Debug existing appointments
  if (existingAppointments && existingAppointments.length > 0) {
    console.log(`[GEN-SLOTS] Processing ${existingAppointments.length} existing appointments:`);
    existingAppointments.forEach((appt, i) => {
      console.log(`[GEN-SLOTS] Appointment #${i+1}: ${appt.time} - ${appt.end_time}`);
    });
  }
  
  // Debug partial closures
  if (partialClosures && partialClosures.length > 0) {
    console.log(`[GEN-SLOTS] Processing ${partialClosures.length} partial closures:`);
    partialClosures.forEach((closure, i) => {
      console.log(`[GEN-SLOTS] Closure #${i+1}: ${closure.start_time} - ${closure.end_time}, Reason: ${closure.reason || 'No reason'}`);
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
  console.log(`[GEN-SLOTS] Starting slot generation loop`);
  for (let time = businessOpen; time <= businessClose - serviceDuration; time += slotDuration) {
    const slotStart = convertMinutesToTime(time);
    const slotEnd = convertMinutesToTime(time + serviceDuration);
    
    // Debug every 5th slot to avoid excessive logging
    const debugThisSlot = (slots.length % 5 === 0);
    if (debugThisSlot) {
      console.log(`[GEN-SLOTS] Evaluating slot ${slots.length+1}: ${slotStart} - ${slotEnd}`);
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
          console.log(`[GEN-SLOTS] Slot unavailable - Past time (timezone: ${tz})`);
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
            console.log(`[GEN-SLOTS] Slot is within working hours: ${workingHour.start_time}-${workingHour.end_time}`);
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
          console.log(`[GEN-SLOTS] Slot unavailable - Outside staff working hours`);
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
            console.log(`[GEN-SLOTS] Slot unavailable due to break: ${breakItem.name || 'unknown'} (${breakItem.start_time}-${breakItem.end_time})`);
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
            console.log(`[GEN-SLOTS] Slot unavailable due to existing appointment: ${appointment.time}-${appointment.end_time}`);
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
            console.log(`[GEN-SLOTS] Slot unavailable due to closure: ${closure.reason || 'No reason'} (${closure.start_time}-${closure.end_time})`);
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
        console.log(`[GEN-SLOTS] Slot is AVAILABLE: ${slotStart} - ${slotEnd}`);
      }
    } else {
      countUnavailable++;
    }
    
    slots.push(slot);
  }
  
  console.log(`[GEN-SLOTS] Slot generation complete`);
  console.log(`[GEN-SLOTS] Total slots: ${slots.length} (Available: ${countAvailable}, Unavailable: ${countUnavailable})`);
  console.log(`[GEN-SLOTS] Unavailable reasons: Outside Staff Hours: ${countOutsideWorkingHours}, Breaks: ${countBreakOverlap}, Appointments: ${countAppointmentOverlap}, Closures: ${countClosureOverlap}`);
  if (countAvailable > 0) {
    const firstAvailable = slots.find(s => s.available);
    console.log(`[GEN-SLOTS] Sample available slot: ${firstAvailable.time} - ${firstAvailable.end_time}`);
  }
  console.log(`[GEN-SLOTS] ========== FINISHED SLOT GENERATION ==========`);
  
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