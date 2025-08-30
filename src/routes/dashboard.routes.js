const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin, isStaff, isBilling } = require('../middleware/auth.middleware');
const dashboardController = require('../controllers/dashboard.controller');

// Admin dashboard comprehensive data endpoint
router.get('/admin', verifyToken, isAdmin, dashboardController.getAdminDashboardData);

// Staff dashboard data endpoint for individual staff member
router.get('/staff', verifyToken, isStaff, dashboardController.getStaffDashboardData);

// Billing dashboard metrics
router.get('/billing', verifyToken, isBilling, dashboardController.getBillingDashboardData);

module.exports = router; 