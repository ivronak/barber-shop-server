# Staff Breaks Implementation

This document outlines the changes made to implement staff-specific breaks in the barber shop system.

## Database Changes

The breaks table has been updated with the following new columns:
- `staff_id` (UUID, nullable): References the staff table to associate breaks with specific staff members
- `day_of_week` (INTEGER, nullable): Numeric representation of the day of week (0 = Sunday, 1 = Monday, etc.)
- `business_hour_id` has been changed to nullable to support staff-specific breaks

## API Endpoints

### Staff Breaks Management

New endpoints have been added to manage staff-specific breaks:

- **GET** `/api/staff/:id/breaks` - Get all breaks for a specific staff member
- **POST** `/api/staff/:id/breaks` - Create a new break for a staff member
- **PUT** `/api/staff/:id/breaks/:breakId` - Update a staff break
- **DELETE** `/api/staff/:id/breaks/:breakId` - Delete a staff break

### Working Hours with Breaks

The existing working hours endpoint has been updated to handle both working hours and breaks in a single call:

- **PUT** `/api/staff/:id/availability` - Update staff working hours and breaks

## Request/Response Examples

### Get Staff Breaks

**Request:**
```
GET /api/staff/:id/breaks
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "breaks": [
    {
      "id": 1,
      "staff_id": "uuid-here",
      "day_of_week": 1,
      "name": "Lunch Break",
      "start_time": "12:00:00",
      "end_time": "13:00:00",
      "business_hour_id": null,
      "created_at": "2023-07-18T10:00:00.000Z",
      "updated_at": "2023-07-18T10:00:00.000Z"
    }
  ]
}
```

### Create Staff Break

**Request:**
```
POST /api/staff/:id/breaks
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Lunch Break",
  "start_time": "12:00:00",
  "end_time": "13:00:00",
  "day_of_week": "monday"
}
```

**Response:**
```json
{
  "success": true,
  "break": {
    "id": 1,
    "staff_id": "uuid-here",
    "day_of_week": 1,
    "name": "Lunch Break",
    "start_time": "12:00:00",
    "end_time": "13:00:00",
    "business_hour_id": null,
    "created_at": "2023-07-18T10:00:00.000Z",
    "updated_at": "2023-07-18T10:00:00.000Z"
  }
}
```

### Update Staff Working Hours with Breaks

**Request:**
```
PUT /api/staff/:id/availability
Authorization: Bearer {token}
Content-Type: application/json

{
  "workingHours": [
    {
      "day_of_week": "monday",
      "start_time": "09:00:00",
      "end_time": "17:00:00",
      "is_break": false
    },
    {
      "day_of_week": "tuesday",
      "start_time": "09:00:00",
      "end_time": "17:00:00",
      "is_break": false
    }
  ],
  "breaks": [
    {
      "name": "Lunch Break",
      "day_of_week": "monday",
      "start_time": "12:00:00",
      "end_time": "13:00:00"
    },
    {
      "name": "Coffee Break",
      "day_of_week": "tuesday",
      "start_time": "15:00:00",
      "end_time": "15:30:00"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "workingHours": [...],
  "breaks": [...]
}
```

## Implementation Details

1. The `Break` model has been updated to include associations with the `Staff` model.
2. The `Staff` model has been updated to include a one-to-many relationship with breaks.
3. The staff controller has been updated to handle staff-specific breaks in addition to working hours.
4. When retrieving staff details, staff-specific breaks are now included in the response.
5. The system now supports both business-hour breaks (admin-defined breaks that apply to all staff) and staff-specific breaks.

## Day of Week Mapping

The system uses numeric values to represent days of the week in the database:
- 0 = Sunday
- 1 = Monday
- 2 = Tuesday
- 3 = Wednesday
- 4 = Thursday
- 5 = Friday
- 6 = Saturday

The API accepts both numeric values and string representations (e.g., "monday", "tuesday") for ease of use.

## Testing

A test script (`test-staff-breaks.js`) has been created to verify the functionality of the new staff breaks implementation. 