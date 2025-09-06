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

// Update staff working hours with numeric day_of_week
const updateStaffWorkingHours = async () => {
  try {
    console.log(`Updating working hours for staff ID: ${staffId}...`);
    const workingHoursData = {
      workingHours: [
        {
          day_of_week: 1, // Monday as number
          start_time: '09:00:00',
          end_time: '17:00:00',
          is_break: false
        },
        {
          day_of_week: 2, // Tuesday as number
          start_time: '09:00:00',
          end_time: '17:00:00',
          is_break: false
        }
      ],
      breaks: [
        {
          name: 'Lunch Break',
          day_of_week: 1, // Monday as number
          start_time: '12:00:00',
          end_time: '13:00:00'
        },
        {
          name: 'Coffee Break',
          day_of_week: 2, // Tuesday as number
          start_time: '15:00:00',
          end_time: '15:30:00'
        }
      ]
    };
    
    const response = await axios.put(`${API_URL}/staff/${staffId}/availability`, workingHoursData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Updated working hours response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Update working hours error:', error.response?.data || error.message);
    process.exit(1);
  }
};

// Delete working hours
const deleteWorkingHours = async () => {
  try {
    console.log(`Deleting working hours for staff ID: ${staffId}...`);
    const workingHoursData = {
      workingHours: [],
      breaks: []
    };
    
    const response = await axios.put(`${API_URL}/staff/${staffId}/availability`, workingHoursData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Deleted working hours response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Delete working hours error:', error.response?.data || error.message);
    process.exit(1);
  }
};

// Main function to run all tests
const runTests = async () => {
  try {
    await login();
    await getStaffList();
    
    // Test working hours with numeric day_of_week
    console.log('\n=== Testing working hours with numeric day_of_week ===');
    await updateStaffWorkingHours();
    
    // Test deleting working hours
    console.log('\n=== Testing deleting working hours ===');
    await deleteWorkingHours();
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Test error:', error);
  }
};

// Run the tests
runTests(); 