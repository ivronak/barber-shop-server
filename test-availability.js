const axios = require('axios');
require('dotenv').config();

const API_URL = process.env.API_URL || 'http://localhost:3000/api';
let token = null;
let staffId = null;

// Login function
const login = async () => {
  try {
    console.log('Logging in as admin...');
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    token = response.data.token;
    console.log('Login successful');
    return token;
  } catch (error) {
    console.error('Login error:', error.response?.data || error.message);
    process.exit(1);
  }
};

// Get staff list
const getStaffList = async () => {
  try {
    console.log('Getting staff list...');
    const response = await axios.get(`${API_URL}/staff`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (response.data.staff && response.data.staff.length > 0) {
      staffId = response.data.staff[0].id;
      console.log(`Found staff ID: ${staffId}`);
      return staffId;
    } else {
      console.error('No staff found');
      process.exit(1);
    }
  } catch (error) {
    console.error('Get staff error:', error.response?.data || error.message);
    process.exit(1);
  }
};

// Test staff availability for a given date
const testStaffAvailability = async (date) => {
  try {
    console.log(`Testing staff availability for date: ${date}...`);
    const response = await axios.get(`${API_URL}/appointments/slots?date=${date}&staffId=${staffId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Staff availability response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Staff availability error:', error.response?.data || error.message);
    return null;
  }
};

// Test public booking slots for a given date
const testPublicBookingSlots = async (date) => {
  try {
    console.log(`Testing public booking slots for date: ${date}...`);
    const response = await axios.get(`${API_URL}/booking/slots?date=${date}&staffId=${staffId}`);
    
    console.log('Public booking slots response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Public booking slots error:', error.response?.data || error.message);
    return null;
  }
};

// Main function to run all tests
const runTests = async () => {
  try {
    await login();
    await getStaffList();
    
    // Test availability for today
    const today = new Date().toISOString().split('T')[0];
    console.log('\n=== Testing staff availability for today ===');
    await testStaffAvailability(today);
    
    // Test availability for tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    console.log('\n=== Testing staff availability for tomorrow ===');
    await testStaffAvailability(tomorrowStr);
    
    // Test public booking slots for today
    console.log('\n=== Testing public booking slots for today ===');
    await testPublicBookingSlots(today);
    
    // Test public booking slots for tomorrow
    console.log('\n=== Testing public booking slots for tomorrow ===');
    await testPublicBookingSlots(tomorrowStr);
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Test error:', error);
  }
};

// Run the tests
runTests(); 