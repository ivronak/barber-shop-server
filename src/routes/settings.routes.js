const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');
const settingsController = require('../controllers/settings.controller');

// Protected routes (admin only for updates)
router.get('/', verifyToken, settingsController.getBusinessSettings);
router.put('/', verifyToken, isAdmin, settingsController.updateBusinessSettings);
router.get('/gst-rates', verifyToken, settingsController.getGSTRates);
router.put('/gst-rates', verifyToken, isAdmin, settingsController.updateGSTRates);
router.delete('/gst-rates/:id', verifyToken, isAdmin, settingsController.deleteGSTRate);

// Business hours routes
router.get('/business-hours', verifyToken, settingsController.getBusinessHours);
router.put('/business-hours', verifyToken, isAdmin, settingsController.updateBusinessHours);

// Batch update route for business hours and breaks
router.put('/business-hours-batch', verifyToken, isAdmin, settingsController.batchUpdateBusinessHoursAndBreaks);

// Break routes
router.get('/business-hours/:businessHourId/breaks', verifyToken, settingsController.getBreaks);
router.post('/business-hours/:businessHourId/breaks', verifyToken, isAdmin, settingsController.createBreak);
router.put('/breaks/:breakId', verifyToken, isAdmin, settingsController.updateBreak);
router.delete('/breaks/:breakId', verifyToken, isAdmin, settingsController.deleteBreak);

module.exports = router; 