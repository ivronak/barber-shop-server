require('dotenv').config();
const fetch = require('node-fetch');
const { User, Staff, sequelize } = require('./src/models');

const API_URL = process.env.API_URL || 'http://localhost:5000/api';

// Test staff login with a specific user or create one if needed
async function testStaffLogin() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Connected to database successfully');
    
    // Find or create a test staff user
    let staffUser = await User.findOne({
      where: {
        email: 'teststaff@example.com',
        role: 'staff'
      }
    });
    
    if (!staffUser) {
      console.log('Creating test staff user...');
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
      
      console.log('Test staff user created with ID:', staffUser.id);
    } else {
      console.log('Found existing test staff user with ID:', staffUser.id);
    }
    
    // Make sure the staff record exists
    let staffRecord = await Staff.findOne({
      where: {
        user_id: staffUser.id
      }
    });
    
    if (!staffRecord) {
      console.log('Creating staff record for test user...');
      staffRecord = await Staff.create({
        user_id: staffUser.id,
        position: 'Test Barber',
        commission_percentage: 20.00,
        is_available: true
      });
      console.log('Staff record created with ID:', staffRecord.id);
    } else {
      console.log('Found existing staff record with ID:', staffRecord.id);
    }
    
    // Test login
    console.log('\nTesting staff login...');
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
    console.log('Login response status:', loginResponse.status);
    console.log('Login response data:', JSON.stringify(loginData, null, 2));
    
    if (loginData.success && loginData.token) {
      console.log('Staff login successful!');
      
      // Test getting user profile
      console.log('\nTesting get user profile...');
      const profileResponse = await fetch(`${API_URL}/auth/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginData.token}`
        }
      });
      
      const profileData = await profileResponse.json();
      console.log('Profile response status:', profileResponse.status);
      console.log('Profile response data:', JSON.stringify(profileData, null, 2));
      
      if (profileData.success) {
        console.log('Got user profile successfully!');
      } else {
        console.log('Failed to get user profile');
      }
    } else {
      console.log('Staff login failed');
    }
    
  } catch (error) {
    console.error('Error testing staff login:', error);
  } finally {
    await sequelize.close();
  }
}

testStaffLogin(); 