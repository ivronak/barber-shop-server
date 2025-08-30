const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const staffRoutes = require('./staff.routes');
const servicesRoutes = require('./services.routes');
const appointmentsRoutes = require('./appointments.routes');
const customersRoutes = require('./customers.routes');
const invoicesRoutes = require('./invoices.routes');
const settingsRoutes = require('./settings.routes');
const reportsRoutes = require('./reports.routes');
const reviewsRoutes = require('./reviews.routes');
const logsRoutes = require('./logs.routes');
const publicRoutes = require('./public.routes');
const publicBarbersRoutes = require('./barbersPublic.routes');
const productsRoutes = require('./products.routes');
const dashboardRoutes = require('./dashboard.routes');
const publicBookingRoutes = require('./publicBooking.routes');
const shopClosuresRoutes = require('./shopClosures.routes');
const usersRoutes = require('./users.routes');
const contactRequestsRoutes = require('./contactRequests.routes');
const galleryImagesRoutes = require('./galleryImages.routes');
const expertsRoutes = require('./experts.routes');
const serviceCategoriesRoutes = require('./serviceCategories.routes');

// Register routes
router.use('/auth', authRoutes);
router.use('/staff', staffRoutes);
router.use('/services', servicesRoutes);
router.use('/appointments', appointmentsRoutes);
router.use('/customers', customersRoutes);
router.use('/invoices', invoicesRoutes);
router.use('/settings', settingsRoutes);
router.use('/reports', reportsRoutes);
router.use('/reviews', reviewsRoutes);
router.use('/logs', logsRoutes);
router.use('/public', publicRoutes);
router.use('/public', publicBarbersRoutes);
router.use('/products', productsRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/booking', publicBookingRoutes);
router.use('/shop-closures', shopClosuresRoutes);
router.use('/users', usersRoutes);
router.use('/contact-requests', contactRequestsRoutes);
router.use('/gallery-images', galleryImagesRoutes);
router.use('/experts', expertsRoutes);
router.use('/service-categories', serviceCategoriesRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'API is running' });
});
router.get('/', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'API is running' });
});

module.exports = router; 