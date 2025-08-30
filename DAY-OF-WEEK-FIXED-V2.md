# Day of Week Calculation Fix V2

## Issue

There was still an inconsistency in how the day of week was calculated and used across different controllers and models:

1. The `WorkingHour` model stores `day_of_week` as a string enum ('monday', 'tuesday', etc.)
2. The `Break` model stores `day_of_week` as a number (0 = Sunday, 1 = Monday, etc.)
3. Some controllers were using different methods to calculate the day of week
4. This was causing a mismatch when closing a week day in the admin settings

## Root Cause

Even after the previous fix, there were still inconsistencies in how the day of week was being calculated across different controllers and functions. The main issues were:

1. Some parts of the code were using direct calculations like `new Date(date).getDay()`
2. Other parts were using arrays to map numeric days to string days
3. The inconsistency led to mismatches in day of week calculations, especially when closing days

## Fix

1. Created a centralized helper function `getConsistentDayOfWeek` in `appointment.utils.js`:

```javascript
function getConsistentDayOfWeek(date) {
  // Ensure we have a Date object
  const dateObj = date instanceof Date ? date : new Date(date);
  
  // Get numeric day of week (0 = Sunday, 1 = Monday, etc.)
  const numericDayOfWeek = dateObj.getDay();
  
  // Map to string day name as used in the database
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayOfWeek = dayNames[numericDayOfWeek];
  
  return { dayOfWeek, numericDayOfWeek };
}
```

2. Updated all controllers to use this helper function:
   - `publicBooking.controller.js` - Updated `getBookingSlots` and `createBooking` functions
   - `appointments.controller.js` - Updated `getAvailableSlots` function
   - `appointment.utils.js` - Updated `checkAvailability` and `generateTimeSlots` functions

3. This ensures consistent day of week calculation across all parts of the application:
   - String day names (e.g., 'monday') for the `WorkingHour` model and `BusinessHour` model
   - Numeric day values (e.g., 1 for Monday) for the `Break` model

## Testing

Created a test script (`test-day-of-week-fixed.js`) to verify the fix by:
1. Testing availability for each day of the week
2. Checking both admin and public booking endpoints
3. Verifying that the day of week is calculated consistently

## Benefits

1. Consistent day of week calculation across all controllers and models
2. Fixed the issue with day mismatches when closing week days
3. Improved code maintainability by centralizing the day of week calculation logic
4. Better handling of breaks and working hours based on the correct day of week

## Next Steps

1. Consider standardizing the `day_of_week` field across all models in a future update
2. Add more comprehensive validation to ensure consistent day of week handling
3. Consider adding unit tests for the day of week calculation function 