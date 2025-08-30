const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin, isStaff } = require('../middleware/auth.middleware');
const staffController = require('../controllers/staff.controller');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Middleware to check if user is admin or the staff member being modified
const isAdminOrSelf = (req, res, next) => {
  const { id } = req.params;
  
  // Allow if admin
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  
  // Allow if staff member is updating their own record
  if (req.user && req.user.role === 'staff' && req.user.staff && req.user.staff.id === id) {
    return next();
  }
  
  // Also check JWT token's staffId if available
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.staffId === id) {
        return next();
      }
    } catch (error) {
      // Token verification failed, continue with normal flow
    }
  }
  
  return res.status(403).json({
    success: false,
    message: 'Access denied. You can only update your own profile.'
  });
};

// Protected routes (admin only for create/update/delete)
router.get('/',  staffController.getAllStaff);
router.get('/:id', verifyToken, staffController.getStaffById);
router.post('/', staffController.createStaff);
router.put('/:id', verifyToken, isAdmin, staffController.updateStaff);
router.put('/:id/profile', verifyToken, isAdminOrSelf, staffController.updateOwnProfile);
router.delete('/:id', verifyToken, isAdmin, staffController.deleteStaff);
router.put('/:id/availability', staffController.updateWorkingHours);

// New routes for staff breaks
router.get('/:id/breaks', verifyToken, isAdminOrSelf, staffController.getStaffBreaks);
router.post('/:id/breaks', staffController.createStaffBreak);
router.put('/:id/breaks/:breakId', verifyToken, isAdminOrSelf, staffController.updateStaffBreak);
router.delete('/:id/breaks/:breakId', verifyToken, isAdminOrSelf, staffController.deleteStaffBreak);

module.exports = router; 