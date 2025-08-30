# Day of Week Standardization

## Overview

This document explains the standardization of day-of-week representation across the barber shop booking system. The standardization ensures consistent handling of days across all parts of the application, fixing issues where setting a day as unavailable in one part of the system wasn't properly reflected in other parts.

## Problem

Previously, the system had inconsistent representations of days of the week:

1. Some parts used numeric values (0-6, where 0 = Sunday, 1 = Monday, etc.)
2. Other parts used string values ('sunday', 'monday', etc.)
3. The `breaks` table used numeric values but needed to match with string values in other tables

This inconsistency caused a bug where setting Monday as unavailable incorrectly showed Tuesday as unavailable in the booking interface.

## Solution

We've standardized all day-of-week representations to use string ENUM values ('sunday', 'monday', etc.) across the system:

1. Updated the `Break` model to use string ENUM values for `day_of_week`
2. Modified controllers to use string day names consistently
3. Created utility functions in `dayOfWeekUtils.js` for day-of-week conversions
4. Updated the database schema to use string ENUM values for `day_of_week` in the `breaks` table

## Implementation Details

### Database Changes

1. The `breaks` table now uses a string ENUM column for `day_of_week` with values: 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
2. The `business_hour_id` column in the `breaks` table is now nullable to support staff-specific breaks
3. Added `staff_id` column to the `breaks` table for staff-specific breaks

### Code Changes

1. Created `dayOfWeekUtils.js` with helper functions:
   - `getDayNameFromNumber(dayNumber)`: Converts numeric day (0-6) to string day name
   - `getDayNumberFromName(dayName)`: Converts string day name to numeric day (0-6)
   - `getDayNameFromDate(date)`: Gets day name from a Date object
   - And more utility functions

2. Updated controllers to use string day names consistently:
   - Staff controller (updateWorkingHours)
   - Settings controller (updateBreak, batchUpdateBusinessHoursAndBreaks)
   - Public controller (getAvailableSlots)
   - Appointments controller (getAvailableSlots)
   - PublicBooking controller (getBookingSlots)

3. Updated `getConsistentDayOfWeek` function in `appointment.utils.js` to return both string and numeric day values

## Usage

When working with days of the week:

1. Always use string day names ('sunday', 'monday', etc.) in database queries and models
2. Use the `dayOfWeekUtils.js` functions for conversions when needed
3. When receiving input from external sources (e.g., frontend), convert numeric values to string values using `getDayNameFromNumber`

## Migration

We've created a migration script to:

1. Add the `staff_id` column to the `breaks` table
2. Make `business_hour_id` nullable
3. Convert existing numeric `day_of_week` values to string values

## Testing

The standardization has been tested to ensure:

1. Existing breaks are correctly migrated to use string day values
2. New breaks are created with string day values
3. The booking system correctly identifies available slots based on day of week
4. Setting a day as unavailable works correctly across the system 