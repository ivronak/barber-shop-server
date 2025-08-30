const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin, isStaff } = require('../middleware/auth.middleware');
const customersController = require('../controllers/customers.controller');

// Customer statistics
router.get('/stats', verifyToken, customersController.getCustomerStats);

// Customer lookup by phone
router.get('/lookup/:phone', verifyToken, customersController.getCustomerByPhone);

// Protected routes (staff or admin)
router.get('/', verifyToken, customersController.getAllCustomers);
router.get('/:id', verifyToken, customersController.getCustomerById);
router.post('/', verifyToken, customersController.createCustomer);
router.put('/:id', verifyToken, customersController.updateCustomer);
router.delete('/:id', verifyToken, isAdmin, customersController.deleteCustomer);

// Customer history routes
router.get('/:id/appointments', verifyToken, customersController.getCustomerAppointments);
router.get('/:id/invoices', verifyToken, customersController.getCustomerInvoices);

module.exports = router; 