const jwt = require('jsonwebtoken');
const { User, Staff } = require('../models');

/**
 * Middleware to verify JWT token from Authorization header
 */
const verifyToken = async (req, res, next) => {
  try {
    // Get token from authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Extract token
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    // If user is staff, attach staff info
    if (user.role === 'staff' && decoded.staffId) {
      const staff = await Staff.findByPk(decoded.staffId);
      if (staff) {
        user.staff = staff;
        // Also attach staffId directly to user object for easier access
        user.staffId = decoded.staffId;
      }
    }
    
    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

/**
 * Middleware to check if user has admin role
 */
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  
  return res.status(403).json({
    success: false,
    message: 'Access denied. Admin role required'
  });
};

/**
 * Middleware to check if user has staff role
 */
const isStaff = (req, res, next) => {
  if (req.user && (req.user.role === 'staff' || req.user.role === 'admin')) {
    return next();
  }
  
  return res.status(403).json({
    success: false,
    message: 'Access denied. Staff role required'
  });
};

/**
 * Middleware to check if user has billing role
 */
const isBilling = (req, res, next) => {
  if (req.user && (req.user.role === 'billing' || req.user.role === 'admin')) {
    return next();
  }
  
  return res.status(403).json({
    success: false,
    message: 'Access denied. Billing role required'
  });
};

module.exports = {
  verifyToken,
  isAdmin,
  isStaff,
  isBilling
}; 