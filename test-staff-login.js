require('dotenv').config();
const fetch = require('node-fetch');
const { User, Staff, sequelize } = require('./src/models');

const API_URL = process.env.API_URL || 'http://localhost:5000/api';

// Test staff login with a specific user or create one if needed
async function testStaffLogin() {
  try {
    
    await sequelize.authenticate();
    
    
    // Find or create a test staff user
    let staffUser = await User.findOne({
      where: {
        email: 'teststaff@example.com',
        role: 'staff'
      }
    });
    
    if (!staffUser) {
      
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('password123', salt);
      
      staffUser = await User.create({
        name: 'Test Staff',
        email: 'teststaff@example.com',
        password: hashedPassword,
        phone: '555-123-4567',
        role: 'staff'
      });
      
      
    } else {
      
    }
    
    // Make sure the staff record exists
    let staffRecord = await Staff.findOne({
      where: {
        user_id: staffUser.id
      }
    });
    
    if (!staffRecord) {
      
      staffRecord = await Staff.create({
        user_id: staffUser.id,
        position: 'Test Barber',
        commission_percentage: 20.00,
        is_available: true
      });
      
    } else {
      
    }
    
    // Test login
    
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'teststaff@example.com',
        password: 'password123'
      })
    });
    
    const loginData = await loginResponse.json();
    
    
    
    if (loginData.success && loginData.token) {
      
      
      // Test getting user profile
      
      const profileResponse = await fetch(`${API_URL}/auth/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginData.token}`
        }
      });
      
      const profileData = await profileResponse.json();
      
      
      
      if (profileData.success) {
        
      } else {
        
      }
    } else {
      
    }
    
  } catch (error) {
    console.error('Error testing staff login:', error);
  } finally {
    await sequelize.close();
  }
}

testStaffLogin(); 