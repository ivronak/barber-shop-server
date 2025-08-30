const express = require('express');
const router = express.Router();
const { getBarbers } = require('../controllers/publicBarbers.controller');

// GET /api/public/barbers
router.get('/barbers', getBarbers);

module.exports = router; 