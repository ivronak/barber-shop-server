const express = require('express');
const router = express.Router();

const serviceCategoriesController = require('../controllers/serviceCategories.controller');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');

// Public – list categories
router.get('/', serviceCategoriesController.getAllCategories);

// Protected admin only routes
router.post('/', verifyToken, isAdmin, serviceCategoriesController.createCategory);
router.put('/:id', verifyToken, isAdmin, serviceCategoriesController.updateCategory);
router.delete('/:id', verifyToken, isAdmin, serviceCategoriesController.deleteCategory);

module.exports = router; 