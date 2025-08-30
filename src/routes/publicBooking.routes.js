const express = require('express');
const router = express.Router();
const publicBookingController = require('../controllers/publicBooking.controller');

// Get services for booking
router.get('/services', publicBookingController.getBookingServices);

// Get staff for booking
router.get('/staff', publicBookingController.getBookingStaff);

// Get available time slots for booking (no longer requires staff_id)
router.get('/slots', publicBookingController.getBookingSlots);

// Create a booking
router.post('/create', publicBookingController.createBooking);

// Get services offered by a specific staff member
router.get('/staff/:staffId/services', publicBookingController.getStaffServices);

// Get staff who can perform a specific service
router.get('/service/:serviceId/staff', publicBookingController.getServiceStaff);

module.exports = router; 