const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin, isStaff } = require('../middleware/auth.middleware');
const servicesController = require('../controllers/services.controller');

// Public routes
router.get('/', servicesController.getAllServices);
router.get('/:id', servicesController.getServiceById);

// Protected routes (admin only)
router.post('/', verifyToken, isAdmin, servicesController.createService);
router.put('/:id', verifyToken, isAdmin, servicesController.updateService);
router.delete('/:id', verifyToken, isAdmin, servicesController.deleteService);

module.exports = router; 