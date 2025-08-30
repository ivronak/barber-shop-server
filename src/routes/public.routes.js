const express = require('express');
const router = express.Router();
const publicController = require('../controllers/public.controller');
const customersController = require('../controllers/customers.controller');

// Get business information
router.get('/business', publicController.getBusinessInfo);

// Get gallery images
router.get('/gallery', publicController.getGallery);

// Get services for public display
router.get('/services', publicController.getServices);

// Get staff for public display
router.get('/staff', publicController.getStaff);

// Get approved reviews for public display
router.get('/reviews', publicController.getReviews);

// Get available time slots for booking (no longer requires staff_id)
router.get('/available-slots', publicController.getAvailableSlots);

// Get active experts for public
router.get('/experts', require('../controllers/experts.controller').getPublicExperts);

// Preflight for contact form (CORS)
router.options('/contact', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res.sendStatus(200);
});

// Submit contact form
router.post('/contact', publicController.submitContact);

// Create a booking from public website (staff_id is now optional)
router.post('/booking', publicController.createBooking);

// Public customer lookup by phone (no auth)
router.get('/customer/lookup/:phone', customersController.getCustomerByPhone);

module.exports = router; 