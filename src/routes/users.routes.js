const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');
const usersController = require('../controllers/users.controller');

// All user management routes are restricted to admins
router.get('/',  verifyToken, isAdmin,usersController.getAllUsers);
router.get('/:id', verifyToken, isAdmin, usersController.getUserById);
router.post('/', verifyToken, isAdmin, usersController.createUser);
router.put('/:id', verifyToken, isAdmin, usersController.updateUser);
router.delete('/:id', verifyToken, isAdmin, usersController.deleteUser);

module.exports = router; 