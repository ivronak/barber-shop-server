const axios = require('axios');
const jwt = require('jsonwebtoken');

// Sample token from curl request
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImJiMWM4NzQ0LWYwMzMtNGQxZS1hOTA4LWY4ZWY4ODE4YTE2NyIsInJvbGUiOiJzdGFmZiIsInN0YWZmSWQiOiJhYmJjMTVmNi03YjQ4LTRkZWItOGUzYi00MjUxNDcyMWQ0MTAiLCJpYXQiOjE3NTA2NzExODMsImV4cCI6MTc1MDc1NzU4M30.swpeZUsGh_GNnSg4XE55hO-JAEITvx-ThMUTt8b23QQ';

// Decode token to extract staffId
let decodedToken;
try {
  decodedToken = jwt.decode(token);
  console.log('Decoded token:', decodedToken);
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
console.log(`Testing for userId: ${userId}`);
console.log(`Testing for staffId: ${staffId}`);
console.log(`Date range: ${dateFrom} to ${dateTo}`);

async function testEndpoints() {
  try {
    // Test 1: Call staff-performance-metrics endpoint with userId
    console.log('\n------ Test 1: staff-performance-metrics with userId ------');
    const test1Response = await axios.get(
      `${baseUrl}/reports/staff-performance-metrics?dateFrom=${dateFrom}&dateTo=${dateTo}&staffId=${userId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    console.log('Response with userId:', JSON.stringify(test1Response.data, null, 2));

    // Test 2: Call staff-performance-metrics endpoint with staffId
    console.log('\n------ Test 2: staff-performance-metrics with staffId ------');
    const test2Response = await axios.get(
      `${baseUrl}/reports/staff-performance-metrics?dateFrom=${dateFrom}&dateTo=${dateTo}&staffId=${staffId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    console.log('Response with staffId:', JSON.stringify(test2Response.data, null, 2));

    // Test 3: Call staff-performance-metrics endpoint without staffId parameter
    console.log('\n------ Test 3: staff-performance-metrics without staffId parameter ------');
    const test3Response = await axios.get(
      `${baseUrl}/reports/staff-performance-metrics?dateFrom=${dateFrom}&dateTo=${dateTo}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    console.log('Response without staffId:', JSON.stringify(test3Response.data, null, 2));

    // Test 4: Call staff report endpoint 
    console.log('\n------ Test 4: regular staff report endpoint ------');
    const test4Response = await axios.get(
      `${baseUrl}/reports/staff?dateFrom=${dateFrom}&dateTo=${dateTo}&sort=revenue_desc`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    console.log('Regular staff report:', JSON.stringify(test4Response.data, null, 2));
    
    // Find the current staff member
    const currentStaff = test4Response.data.data.find(staff => staff.staff_id === staffId);
    console.log('\nCurrent staff from report:', currentStaff);

  } catch (error) {
    console.error('Error testing endpoints:', error.response?.data || error.message);
  }
}

testEndpoints(); 