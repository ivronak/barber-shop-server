const express = require('express');
const router = express.Router();
const productsController = require('../controllers/products.controller');

// Get all products
router.get('/', productsController.getAllProducts);

// Get a single product by ID
router.get('/:id', productsController.getProductById);

// Create a new product
router.post('/', productsController.createProduct);

// Update an existing product
router.put('/:id', productsController.updateProduct);

// Delete a product
router.delete('/:id', productsController.deleteProduct);

module.exports = router; 