const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin, isBilling } = require('../middleware/auth.middleware');
const invoicesController = require('../controllers/invoices.controller');

// Get all invoices
router.get('/', verifyToken, invoicesController.getAllInvoices);

// Get invoice by ID
router.get('/:id', invoicesController.getInvoiceById);

// Create new invoice
router.post('/', verifyToken, invoicesController.createInvoice);

// Update invoice
router.put('/:id', verifyToken, isBilling, invoicesController.updateInvoice);

// Send invoice by email
router.post('/:id/send', verifyToken, isBilling, invoicesController.sendInvoice);

module.exports = router; 