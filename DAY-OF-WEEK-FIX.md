# Day of Week Calculation Fix

## Issue

There was an inconsistency in how the day of week was calculated and used across different controllers:

1. The `WorkingHour` model stores `day_of_week` as a string enum ('monday', 'tuesday', etc.)
2. The `Break` model stores `day_of_week` as a number (0 = Sunday, 1 = Monday, etc.)
3. Controllers were using `toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()` to get the day name
4. This was causing a mismatch when the staff turned off Monday availability but the public booking form was showing Tuesday

## Root Cause

The issue was in how the day of week was being calculated in the controllers:

```javascript
// Original code - problematic
const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
```

This approach has two problems:
1. It depends on the locale settings of the server
2. It may not match exactly with the ENUM values in the database (e.g., capitalization, formatting)

## Fix

Changed all controllers to use a consistent approach for calculating the day of week:

```javascript
// Fixed code
const date_obj = new Date(date);
const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const dayOfWeek = dayNames[date_obj.getDay()];
const numericDayOfWeek = date_obj.getDay(); // 0 = Sunday, 1 = Monday, etc.
```

This ensures:
1. The string day name matches exactly with the ENUM values in the `WorkingHour` model
2. The numeric day value matches with the values in the `Break` model
3. The calculation is consistent across all controllers

## Files Updated

1. `publicBooking.controller.js`
   - Updated `getBookingSlots` function
   - Updated `createBooking` function

2. `public.controller.js`
   - Updated `getAvailableSlots` function

3. `appointments.controller.js`
   - Updated `getAvailableSlots` function

## Testing

Created a test script (`test-day-of-week-fix.js`) to verify the fix by:
1. Testing availability for each day of the week
2. Checking both admin and public booking endpoints
3. Verifying that the day of week is calculated correctly

## Next Steps

1. Consider standardizing the `day_of_week` field across all models in a future update
2. Add more comprehensive validation to ensure consistent day of week handling 