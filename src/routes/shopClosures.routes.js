const express = require('express');
const router = express.Router();
const shopClosuresController = require('../controllers/shopClosures.controller');
const { verifyToken, isAdmin } = require('../middleware/auth');

// Get all shop closures
router.get('/', verifyToken, shopClosuresController.getAllShopClosures);

// Get shop closure by ID
router.get('/:id', verifyToken, shopClosuresController.getShopClosureById);

// Create shop closure
router.post('/', verifyToken, isAdmin, shopClosuresController.createShopClosure);

// Update shop closure
router.put('/:id', verifyToken, isAdmin, shopClosuresController.updateShopClosure);

// Delete shop closure
router.delete('/:id', verifyToken, isAdmin, shopClosuresController.deleteShopClosure);

module.exports = router; 