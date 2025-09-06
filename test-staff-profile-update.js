require('dotenv').config();
const axios = require('axios');

async function testStaffProfileUpdate() {
  try {
    // Replace with actual staff token and ID
    const staffToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImJiMWM4NzQ0LWYwMzMtNGQxZS1hOTA4LWY4ZWY4ODE4YTE2NyIsInJvbGUiOiJzdGFmZiIsInN0YWZmSWQiOiJhYmJjMTVmNi03YjQ4LTRkZWItOGUzYi00MjUxNDcyMWQ0MTAiLCJpYXQiOjE3NTAwNjk2OTgsImV4cCI6MTc1MDE1NjA5OH0.RwL-eRn8Z9Xa1lCTtVKTcSVmzmpkatKHeC9TC3ZNlK0';
    const staffId = 'abbc15f6-7b48-4deb-8e3b-42514721d410';
    
    console.log('Testing staff profile update...');
    
    // Use the API URL from the environment or default to localhost
    const apiUrl = process.env.API_URL || 'https://barber-shop-api-eight.vercel.app/api';
    console.log(`Using API URL: ${apiUrl}`);
    
    // 1. First try updating with the old endpoint (should fail for staff)
    try {
      console.log(`Testing old endpoint: PUT ${apiUrl}/staff/${staffId}`);
      const oldEndpointResponse = await axios({
        method: 'PUT',
        url: `${apiUrl}/staff/${staffId}`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${staffToken}`
        },
        data: {
          bio: 'Testing old endpoint - should fail',
          email: 'test@example.com',
          phone: '1234567890'
        }
      });
      
      console.log('Old endpoint response (should not succeed):', oldEndpointResponse.data);
    } catch (error) {
      console.log('Old endpoint error (expected):', error.response?.data || error.message);
      console.log('Error status:', error.response?.status);
    }
    
    console.log('\n-----------------------------------\n');
    
    // 2. Now try updating with the new profile endpoint (should succeed)
    try {
      console.log(`Testing new endpoint: PUT ${apiUrl}/staff/${staffId}/profile`);
      const newEndpointResponse = await axios({
        method: 'PUT',
        url: `${apiUrl}/staff/${staffId}/profile`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${staffToken}`
        },
        data: {
          bio: 'Testing new profile endpoint - should succeed',
          email: 'Joj@barber.com',
          phone: '7788995525'
        }
      });
      
      console.log('New endpoint response (should succeed):', newEndpointResponse.data);
    } catch (error) {
      console.log('New endpoint error (unexpected):', error.response?.data || error.message);
      console.log('Error status:', error.response?.status);
      console.log('Full error:', error);
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testStaffProfileUpdate(); 