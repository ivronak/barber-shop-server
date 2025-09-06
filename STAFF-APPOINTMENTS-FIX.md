
# Staff Appointments Controller Fix

## Issue
The staff appointments endpoint is returning "Access denied. Staff profile not found" because it's trying to access `req.user.staffId` which doesn't exist.

## Fix
1. Updated the `getStaffAppointments` controller to properly look up the staff record using the user ID.
2. Added additional logging to help diagnose issues.

## Updated Code
```javascript
exports.getStaffAppointments = async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      customerId, 
      status, 
      sort, 
      page = 1, 
      limit = 100, 
      searchTerm,
      timeOfDay,
      serviceId
    } = req.query;
    
    console.log('Staff appointments request from user:', {
      userId: req.user?.id,
      userRole: req.user?.role
    });
    
    // First, check if the user exists and has a valid role
    if (!req.user || req.user.role !== 'staff') {
      console.log('Access denied: User role is not staff', req.user?.role);
      return res.status(403).json({
        success: false,
        message: 'Access denied. Staff role required.'
      });
    }
    
    // Find the staff record for this user
    const staffMember = await Staff.findOne({ where: { user_id: req.user.id } });
    console.log('Staff lookup result:', staffMember ? `Found staff ID: ${staffMember.id}` : 'Not found');
    
    if (!staffMember) {
      console.log('No staff record found for user ID:', req.user.id);
      return res.status(403).json({
        success: false,
        message: 'Access denied. Staff profile not found.'
      });
    }
    
    const staffId = staffMember.id;
    
    // Prepare queries for appointments, staff, and services
    const appointmentsQuery = {
      where: { staff_id: staffId }, // Filter by the authenticated staff member
      order: [],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      include: [
        { association: 'customer' },
        { association: 'staff', include: ['user'] },
        { association: 'appointmentServices', include: ['service'] }
      ]
    };
```

## Implementation Steps
1. Replace the `getStaffAppointments` function in `src/controllers/appointments.controller.js` with the updated code above.
2. Restart the server.

## Testing
1. Log in as a staff member.
2. Navigate to the staff appointments page.
3. Verify that appointments are loaded correctly.
