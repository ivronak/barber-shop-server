const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin, isStaff } = require('../middleware/auth.middleware');
const appointmentsController = require('../controllers/appointments.controller');

// Protected routes (staff or admin)
router.get('/',  appointmentsController.getAllAppointments);
router.get('/available-slots', appointmentsController.getAvailableSlots);
router.get('/admin-dashboard', verifyToken, isAdmin, appointmentsController.getAdminAppointments);
router.get('/staff-dashboard', verifyToken, isStaff, appointmentsController.getStaffAppointments);
router.get('/calendar', appointmentsController.getCalendarAppointments);
// router.get('/calendar', verifyToken, isAdmin, appointmentsController.getCalendarAppointments);
router.get('/:id', verifyToken, appointmentsController.getAppointmentById);
router.post('/', verifyToken, appointmentsController.createAppointment);
router.put('/:id', verifyToken, appointmentsController.updateAppointment);
router.delete('/:id', verifyToken, appointmentsController.cancelAppointment);
router.post('/:id/reschedule', verifyToken, appointmentsController.rescheduleAppointment);

module.exports = router; 