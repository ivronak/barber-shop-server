const axios = require('axios');
const jwt = require('jsonwebtoken');

// Sample token from curl request
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImJiMWM4NzQ0LWYwMzMtNGQxZS1hOTA4LWY4ZWY4ODE4YTE2NyIsInJvbGUiOiJzdGFmZiIsInN0YWZmSWQiOiJhYmJjMTVmNi03YjQ4LTRkZWItOGUzYi00MjUxNDcyMWQ0MTAiLCJpYXQiOjE3NTA2NzExODMsImV4cCI6MTc1MDc1NzU4M30.swpeZUsGh_GNnSg4XE55hO-JAEITvx-ThMUTt8b23QQ';

// Decode token to extract staffId
let decodedToken;
try {
  decodedToken = jwt.decode(token);
  
} catch (error) {
  console.error('Error decoding token:', error);
  process.exit(1);
}

// Test parameters
const baseUrl = 'https://barber-shop-api-eight.vercel.app/api';
const userId = decodedToken.id;
const staffId = decodedToken.staffId;
const dateFrom = '2025-06-16';
const dateTo = '2025-06-23';

// Log info




async function testEndpoints() {
  try {
    // Test 1: Call staff-performance-metrics endpoint with userId
    
    const test1Response = await axios.get(
      `${baseUrl}/reports/staff-performance-metrics?dateFrom=${dateFrom}&dateTo=${dateTo}&staffId=${userId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    

    // Test 2: Call staff-performance-metrics endpoint with staffId
    
    const test2Response = await axios.get(
      `${baseUrl}/reports/staff-performance-metrics?dateFrom=${dateFrom}&dateTo=${dateTo}&staffId=${staffId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    

    // Test 3: Call staff-performance-metrics endpoint without staffId parameter
    
    const test3Response = await axios.get(
      `${baseUrl}/reports/staff-performance-metrics?dateFrom=${dateFrom}&dateTo=${dateTo}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    

    // Test 4: Call staff report endpoint 
    
    const test4Response = await axios.get(
      `${baseUrl}/reports/staff?dateFrom=${dateFrom}&dateTo=${dateTo}&sort=revenue_desc`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    
    
    // Find the current staff member
    const currentStaff = test4Response.data.data.find(staff => staff.staff_id === staffId);
    

  } catch (error) {
    console.error('Error testing endpoints:', error.response?.data || error.message);
  }
}

testEndpoints(); 