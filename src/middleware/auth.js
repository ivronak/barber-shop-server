const jwt = require('jsonwebtoken');
const db = require('../models');
const secretKey = process.env.JWT_SECRET || 'your-default-secret-key-for-dev';

/**
 * Middleware to authenticate user using JWT token
 */
const verifyToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed. No token provided or invalid format.'
      });
    }

    // Extract and verify token
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, secretKey);
    
    // Find the user
    const user = await db.User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed. User not found.'
      });
    }
    
    // Add user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      message: 'Authentication failed. Invalid token.'
    });
  }
};

/**
 * Middleware to check if user is an admin
 */
const isAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authorization failed. User not authenticated.'
      });
    }
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Authorization failed. Admin access required.'
      });
    }
    
    next();
  } catch (error) {
    console.error('Admin authorization error:', error);
    return res.status(403).json({
      success: false,
      message: 'Authorization failed.'
    });
  }
};

/**
 * Middleware to authorize user based on roles
 */
const authorize = (roles = []) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authorization failed. User not authenticated.'
        });
      }
      
      // Check if user has required role
      if (roles.length && !roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Authorization failed. Insufficient permissions.'
        });
      }
      
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      return res.status(403).json({
        success: false,
        message: 'Authorization failed.'
      });
    }
  };
};

module.exports = {
  verifyToken,
  isAdmin,
  authorize
}; 