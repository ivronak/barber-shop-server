# Day of Week Frontend Fix

## Issue

There was a mismatch between how the day of week was handled in the frontend and backend:

1. In the backend:
   - WorkingHour model uses string enum ('monday', 'tuesday', etc.)
   - Break model uses number (0 = Sunday, 1 = Monday, etc.)
   - Controllers were updated to handle both formats correctly

2. In the frontend (WorkingHours.tsx):
   - The dropdown for selecting the day of week for breaks had the options in the wrong order
   - Sunday was placed at the end of the list with value "0" instead of at the beginning

This caused confusion when staff tried to set breaks for specific days, as the day shown in the UI didn't match the actual day stored in the database.

## Root Cause

The issue was in the order of options in the day of week dropdown for breaks:

```html
<!-- Original incorrect order -->
<option value="1">Monday</option>
<option value="2">Tuesday</option>
<option value="3">Wednesday</option>
<option value="4">Thursday</option>
<option value="5">Friday</option>
<option value="6">Saturday</option>
<option value="0">Sunday</option>
```

This made Sunday appear at the end of the list, while in the backend it's treated as the first day of the week (index 0).

## Fix

Changed the order of options in the dropdown to match the backend's day of week mapping:

```html
<!-- Fixed order -->
<option value="0">Sunday</option>
<option value="1">Monday</option>
<option value="2">Tuesday</option>
<option value="3">Wednesday</option>
<option value="4">Thursday</option>
<option value="5">Friday</option>
<option value="6">Saturday</option>
```

This ensures that the day of week values in the frontend match the values expected by the backend.

## Files Updated

1. `src/pages/staff/WorkingHours.tsx`
   - Updated the order of options in the day of week dropdown for breaks

## Testing

Manually tested the fix by:
1. Adding breaks for different days of the week
2. Verifying that the breaks appear on the correct days in the calendar
3. Checking that the staff availability is correctly shown in the booking form

## Next Steps

1. Consider adding more validation to ensure consistent day of week handling across the application
2. Add unit tests to verify the correct day of week mapping between frontend and backend 