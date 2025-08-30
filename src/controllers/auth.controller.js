const jwt = require('jsonwebtoken');
const { User, Staff, ActivityLog } = require('../models');
const { validationResult } = require('express-validator');

/**
 * Login user and return JWT token
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log(`Login attempt for email: ${email}`);
    
    // Validate input
    if (!email || !password) {
      console.log('Login failed: Email or password missing');
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    
    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      console.log(`Login failed: No user found with email ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    console.log(`User found: ${user.name}, Role: ${user.role}, ID: ${user.id}`);
    
    // Check password
    const isPasswordValid = await user.checkPassword(password);
    if (!isPasswordValid) {
      console.log(`Login failed: Invalid password for ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    console.log(`Password validated for ${email}`);
    
    // If user is staff, include staff details
    let staffDetails = null;
    let tokenPayload = { id: user.id, role: user.role };
    
    if (user.role === 'staff') {
      staffDetails = await Staff.findOne({ where: { user_id: user.id } });
      
      if (staffDetails) {
        console.log(`Staff details found for user ID: ${user.id}, staff ID: ${staffDetails.id}`);
      } else {
        console.log(`No staff record found for user ID: ${user.id}`);
        
        // Create staff record if it doesn't exist (default to active)
        staffDetails = await Staff.create({
          user_id: user.id,
          position: 'Barber',
          commission_percentage: 20.00,
          is_available: true
        });
        
        console.log(`Created staff record with ID: ${staffDetails.id}`);
      }

      // Prevent login if staff account is inactive
      if (staffDetails && staffDetails.is_available === false) {
        console.log(`Login blocked: Staff ID ${staffDetails.id} is inactive`);
        return res.status(403).json({
          success: false,
          message: 'Your account is inactive. Please contact the administrator.'
        });
      }

      // Include staff ID in the token payload
      tokenPayload.staffId = staffDetails.id;
    }
    
    // Generate token with the updated payload
    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Log activity
    await ActivityLog.create({
      user_id: user.id,
      user_name: user.name,
      user_role: user.role,
      action: 'Login',
      details: `User logged in from ${req.ip}`
    });
    
    console.log(`Login successful for ${email}`);
    
    // Return token and user info
    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        image: user.image,
        staff: staffDetails
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Register new user
 */
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;
    
    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email and password are required'
      });
    }
    
    // Check if email already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already in use'
      });
    }
    
    // Create user
    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: role || 'staff'
    });
    
    // If role is staff, create staff record
    if (user.role === 'staff') {
      await Staff.create({
        user_id: user.id,
        position: 'Barber',
        commission_percentage: 0.00
      });
    }
    
    // Generate token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Log activity
    await ActivityLog.create({
      user_id: user.id,
      user_name: user.name,
      user_role: user.role,
      action: 'Registration',
      details: `New ${user.role} account created`
    });
    
    // Return token and user info
    return res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        image: user.image
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get current user profile
 */
exports.getProfile = async (req, res) => {
  try {
    const user = req.user;
    
    // If user is staff, include staff details
    let staffDetails = null;
    if (user.role === 'staff') {
      staffDetails = await Staff.findOne({ where: { user_id: user.id } });
    }
    
    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        image: user.image,
        staff: staffDetails
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}; 