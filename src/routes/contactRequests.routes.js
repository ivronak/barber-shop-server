const express = require('express');
const router = express.Router();
const contactRequestsController = require('../controllers/contactRequests.controller');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');

// All routes here require admin auth
router.use(verifyToken, isAdmin);

// GET /api/contact-requests
router.get('/', contactRequestsController.getContactRequests);

module.exports = router; 