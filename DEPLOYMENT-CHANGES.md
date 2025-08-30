# Staff Profile Update - Deployment Changes

## Summary

This update adds the ability for staff members to update their own profile information. Previously, only admins could update staff profiles, but now staff members can update their own email, phone, and bio.

## Files Changed

1. `/src/controllers/staff.controller.js` - Added a new controller method `updateOwnProfile` that allows staff to update their own profile details.

2. `/src/routes/staff.routes.js` - Added a new route `/staff/:id/profile` that uses the `isAdminOrSelf` middleware to allow staff to update their own profile.

## Frontend Changes

1. Updated the staff profile component to use the new API endpoint.
2. Added a new `updateStaffProfile` function in the staff service.

## Testing

To test these changes:

1. Log in as a staff member
2. Navigate to the profile page
3. Update your profile information
4. Save changes

## API Endpoints

### New Endpoint

- **URL**: `/api/staff/:id/profile`
- **Method**: `PUT`
- **Auth Required**: Yes (Staff or Admin)
- **Body**: 
```json
{
  "email": "staff@example.com",
  "phone": "1234567890",
  "bio": "Updated bio information"
}
```
- **Response**: 
```json
{
  "success": true,
  "staff": {
    // Staff object with updated information
  }
}
```

## Deployment Instructions

1. Deploy the updated API to Vercel
2. Deploy the updated frontend
3. Test the functionality to ensure staff can update their profiles 