const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const authController = require('../controllers/auth.controller');

// Auth routes
router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/me', verifyToken, authController.getProfile);

module.exports = router; 