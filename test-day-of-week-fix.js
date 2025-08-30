const axios = require('axios');
require('dotenv').config();

const API_URL = 'https://barber-shop-api-eight.vercel.app/api';
let token = null;
let staffId = null;

// Login function
const login = async () => {
  try {
    console.log('Logging in as admin...');
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@barbershop.com',
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

// Test staff availability for specific days
const testStaffAvailability = async (date, expectedDayOfWeek) => {
  try {
    console.log(`\nTesting staff availability for date: ${date} (expected day: ${expectedDayOfWeek})...`);
    
    // Test admin appointments endpoint
    console.log('Testing admin appointments endpoint...');
    const adminResponse = await axios.get(`${API_URL}/appointments/slots?date=${date}&staffId=${staffId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Admin response status:', adminResponse.status);
    console.log('Admin response message:', adminResponse.data.message || 'No message');
    console.log('Admin slots count:', adminResponse.data.slots?.length || 0);
    
    // Test public booking endpoint
    console.log('\nTesting public booking endpoint...');
    const publicResponse = await axios.get(`${API_URL}/booking/slots?date=${date}&staff_id=${staffId}&service_id=1`);
    
    console.log('Public response status:', publicResponse.status);
    console.log('Public response message:', publicResponse.data.message || 'No message');
    console.log('Public slots count:', publicResponse.data.slots?.length || 0);
    
    return {
      adminResponse: adminResponse.data,
      publicResponse: publicResponse.data
    };
  } catch (error) {
    console.error('Test error:', error.response?.data || error.message);
    return null;
  }
};

// Main function to run all tests
const runTests = async () => {
  try {
    await login();
    await getStaffList();
    
    // Get dates for each day of the week
    const today = new Date();
    const dates = [];
    
    // Generate dates for the next 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      
      dates.push({
        date: dateStr,
        dayOfWeek: dayOfWeek,
        dayName: dayNames[dayOfWeek]
      });
    }
    
    console.log('Testing dates:', dates);
    
    // Test each day
    for (const dateInfo of dates) {
      await testStaffAvailability(dateInfo.date, dateInfo.dayName);
    }
    
    console.log('\nAll tests completed!');
  } catch (error) {
    console.error('Error running tests:', error);
  }
};

// Run the tests
runTests(); 