require('dotenv').config();
const axios = require('axios');

async function testStaffProfileUpdate() {
  try {
    // Replace with actual staff token and ID
    const staffToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImJiMWM4NzQ0LWYwMzMtNGQxZS1hOTA4LWY4ZWY4ODE4YTE2NyIsInJvbGUiOiJzdGFmZiIsInN0YWZmSWQiOiJhYmJjMTVmNi03YjQ4LTRkZWItOGUzYi00MjUxNDcyMWQ0MTAiLCJpYXQiOjE3NTAwNjk2OTgsImV4cCI6MTc1MDE1NjA5OH0.RwL-eRn8Z9Xa1lCTtVKTcSVmzmpkatKHeC9TC3ZNlK0';
    const staffId = 'abbc15f6-7b48-4deb-8e3b-42514721d410';
    
    
    
    // Use the API URL from the environment or default to localhost
    const apiUrl = process.env.API_URL || 'https://barber-shop-api-eight.vercel.app/api';
    
    
    // 1. First try updating with the old endpoint (should fail for staff)
    try {
      
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
      
      
    } catch (error) {
      
      
    }
    
    
    
    // 2. Now try updating with the new profile endpoint (should succeed)
    try {
      
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
      
      
    } catch (error) {
      
      
      
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testStaffProfileUpdate(); 