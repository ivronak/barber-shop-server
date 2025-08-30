const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin, isStaff } = require('../middleware/auth.middleware');
const reportsController = require('../controllers/reports.controller');

// Dashboard statistics
router.get('/dashboard', verifyToken, isStaff, reportsController.getDashboardStats);

// Revenue reports
router.get('/revenue', verifyToken, isStaff, reportsController.getRevenueReport);

// Service performance reports
router.get('/services', verifyToken, isStaff, reportsController.getServicesReport);

// Staff performance reports
router.get('/staff', verifyToken, isStaff, reportsController.getStaffReport);

// Tips and discounts reports
router.get('/tips-discounts', verifyToken, isStaff, reportsController.getTipsAndDiscountsReport);

// Revenue by day of week
router.get('/revenue-by-day', verifyToken, isStaff, reportsController.getRevenueByDayOfWeek);

// Advanced metrics
router.get('/advanced-revenue', verifyToken, isStaff, reportsController.getAdvancedRevenueMetrics);
router.get('/advanced-staff', verifyToken, isStaff, reportsController.getAdvancedStaffMetrics);
router.get('/advanced-services', verifyToken, isStaff, reportsController.getAdvancedServiceMetrics);

// New endpoint for staff performance metrics
router.get('/staff-performance-metrics', verifyToken, isStaff, reportsController.getStaffPerformanceMetrics);

module.exports = router; 