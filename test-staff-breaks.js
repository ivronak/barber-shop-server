const axios = require('axios');
require('dotenv').config();

const API_URL = process.env.API_URL || 'http://localhost:3000/api';
let token = null;
let staffId = null;
let breakId = null;

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

// Get staff breaks
const getStaffBreaks = async () => {
  try {
    console.log(`Getting breaks for staff ID: ${staffId}...`);
    const response = await axios.get(`${API_URL}/staff/${staffId}/breaks`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Staff breaks:', JSON.stringify(response.data, null, 2));
    return response.data.breaks;
  } catch (error) {
    console.error('Get staff breaks error:', error.response?.data || error.message);
    return [];
  }
};

// Create staff break
const createStaffBreak = async () => {
  try {
    console.log(`Creating break for staff ID: ${staffId}...`);
    const breakData = {
      name: 'Lunch Break',
      start_time: '12:00:00',
      end_time: '13:00:00',
      day_of_week: 'monday'
    };
    
    const response = await axios.post(`${API_URL}/staff/${staffId}/breaks`, breakData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    breakId = response.data.break.id;
    console.log(`Created break ID: ${breakId}`);
    console.log('Break data:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Create staff break error:', error.response?.data || error.message);
    process.exit(1);
  }
};

// Update staff break
const updateStaffBreak = async () => {
  try {
    console.log(`Updating break ID: ${breakId}...`);
    const updateData = {
      name: 'Extended Lunch Break',
      start_time: '12:00:00',
      end_time: '14:00:00',
      day_of_week: 'monday'
    };
    
    const response = await axios.put(`${API_URL}/staff/${staffId}/breaks/${breakId}`, updateData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Updated break data:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Update staff break error:', error.response?.data || error.message);
    process.exit(1);
  }
};

// Delete staff break
const deleteStaffBreak = async () => {
  try {
    console.log(`Deleting break ID: ${breakId}...`);
    const response = await axios.delete(`${API_URL}/staff/${staffId}/breaks/${breakId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Delete response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Delete staff break error:', error.response?.data || error.message);
    process.exit(1);
  }
};

// Update staff working hours with breaks
const updateStaffWorkingHours = async () => {
  try {
    console.log(`Updating working hours for staff ID: ${staffId}...`);
    const workingHoursData = {
      workingHours: [
        {
          day_of_week: 'monday',
          start_time: '09:00:00',
          end_time: '17:00:00',
          is_break: false
        },
        {
          day_of_week: 'tuesday',
          start_time: '09:00:00',
          end_time: '17:00:00',
          is_break: false
        }
      ],
      breaks: [
        {
          name: 'Lunch Break',
          day_of_week: 'monday',
          start_time: '12:00:00',
          end_time: '13:00:00'
        },
        {
          name: 'Coffee Break',
          day_of_week: 'tuesday',
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

// Get staff details
const getStaffDetails = async () => {
  try {
    console.log(`Getting details for staff ID: ${staffId}...`);
    const response = await axios.get(`${API_URL}/staff/${staffId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Staff details:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Get staff details error:', error.response?.data || error.message);
    process.exit(1);
  }
};

// Main function to run all tests
const runTests = async () => {
  try {
    await login();
    await getStaffList();
    
    // Test individual break endpoints
    console.log('\n=== Testing individual break endpoints ===');
    await getStaffBreaks();
    await createStaffBreak();
    await getStaffBreaks();
    await updateStaffBreak();
    await getStaffBreaks();
    await deleteStaffBreak();
    await getStaffBreaks();
    
    // Test working hours with breaks
    console.log('\n=== Testing working hours with breaks ===');
    await updateStaffWorkingHours();
    await getStaffDetails();
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Test error:', error);
  }
};

// Run the tests
runTests(); 