const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');
const logsController = require('../controllers/logs.controller');

// Get all activity logs
router.get('/', verifyToken, isAdmin, logsController.getActivityLogs);

module.exports = router; 