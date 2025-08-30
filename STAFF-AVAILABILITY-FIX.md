# Staff Availability Fix for Timeslot Generation

## Issue

There was a mismatch between how the `day_of_week` field is stored in different models and how it's being queried in various controllers:

1. In the `WorkingHour` model, `day_of_week` is stored as a string enum ('monday', 'tuesday', etc.)
2. In the `Break` model, `day_of_week` is stored as a number (0 = Sunday, 1 = Monday, etc.)
3. Some controllers were trying to query the `WorkingHour` model using numeric day values, which was causing availability checks to fail

## Changes Made

### 1. Fixed the `publicBooking.controller.js`

- Updated the query for staff working hours to use string day names instead of numeric values:
```javascript
const workingHours = await WorkingHour.findAll({
  where: {
    staff_id,
    day_of_week: dayOfWeek, // Using string day name (e.g., 'monday')
  },
});
```

### 2. Updated the `appointments.controller.js`

- Added the `Break` model to the imports:
```javascript
const { 
  // Other imports...
  Break
} = require('../models');
```

- Updated the `getAvailableSlots` function to use the `Break` model for staff breaks:
```javascript
// Convert dayOfWeek string to numeric day of week for the Break model
const numericDayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(dayOfWeek);

// Get staff-specific breaks from the Break model
const staffBreaks = await Break.findAll({
  where: { 
    staff_id: staffId,
    day_of_week: numericDayOfWeek
  }
});
```

### 3. Updated the `public.controller.js`

- Added the `Break` model to the imports:
```javascript
const { 
  // Other imports...
  Break
} = require('../models');
```

- Updated the `getAvailableSlots` function to use the `Break` model for staff breaks:
```javascript
// Convert dayOfWeek string to numeric day of week for the Break model
const numericDayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(dayOfWeek);

// Get staff-specific breaks from the Break model
const staffBreaks = await Break.findAll({
  where: { 
    staff_id: staffId,
    day_of_week: numericDayOfWeek
  }
});
```

### 4. Fixed the `staff.controller.js`

- Updated the `updateWorkingHours` function to handle both string and numeric `day_of_week` values for breaks:
```javascript
// Check if day_of_week is already a number
if (typeof breakItem.day_of_week === 'number') {
  numericDayOfWeek = breakItem.day_of_week;
} else if (typeof breakItem.day_of_week === 'string') {
  // Convert string day name to number
  switch (breakItem.day_of_week.toLowerCase()) {
    case 'sunday': numericDayOfWeek = 0; break;
    case 'monday': numericDayOfWeek = 1; break;
    // ...other days...
    default: 
      // Try to parse it as a number
      const parsed = parseInt(breakItem.day_of_week, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 6) {
        numericDayOfWeek = parsed;
      } else {
        continue; // Skip if day is invalid
      }
  }
} else {
  continue; // Skip if day_of_week is neither a string nor a number
}
```

- Made similar updates to the `createStaffBreak` and `updateStaffBreak` functions

## Testing

Created a test script (`test-availability.js`) to verify the changes by testing:
1. Staff availability for the current date
2. Staff availability for the next day
3. Public booking slots for the current date
4. Public booking slots for the next day

## Next Steps

1. Run the test script to verify the changes
2. Monitor the system for any further availability issues
3. Consider standardizing the `day_of_week` field across all models in a future update 