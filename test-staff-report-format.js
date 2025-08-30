require('dotenv').config();
const axios = require('axios');

// Set up the API URL and authentication
const API_URL = process.env.API_URL || 'http://localhost:3000/api';
// You'll need to provide a valid auth token for your environment
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || 'your-auth-token';

// Headers with authentication token
const headers = {
  'Authorization': `Bearer ${AUTH_TOKEN}`,
  'Content-Type': 'application/json'
};

// Get current date and date 30 days ago for testing
const now = new Date();
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(now.getDate() - 30);

const dateFrom = thirtyDaysAgo.toISOString().split('T')[0];
const dateTo = now.toISOString().split('T')[0];

// Test both the staff report and advanced staff metrics endpoints
async function testStaffReportFormats() {
  try {
    console.log('===== TESTING STAFF REPORT API FORMATS =====');
    console.log(`Date Range: ${dateFrom} to ${dateTo}`);
    
    // Test basic staff report endpoint
    console.log('\n1. Testing basic staff report endpoint:');
    console.log(`GET ${API_URL}/reports/staff?dateFrom=${dateFrom}&dateTo=${dateTo}`);
    
    try {
      const basicResponse = await axios.get(
        `${API_URL}/reports/staff?dateFrom=${dateFrom}&dateTo=${dateTo}`,
        { headers }
      );
      
      if (basicResponse.data.success) {
        console.log('✅ Basic Staff Report API Success!');
        
        if (basicResponse.data.data && basicResponse.data.data.length > 0) {
          // Log the format of the first staff member's data
          const firstStaff = basicResponse.data.data[0];
          console.log('\nSample Staff Data Format:');
          console.log(JSON.stringify(firstStaff, null, 2));
          
          // Specifically check commission fields
          console.log('\nCommission fields:');
          console.log(`staff_id: ${firstStaff.staff_id}`);
          console.log(`staff_name: ${firstStaff.staff_name}`);
          console.log(`revenue: ${firstStaff.revenue} (type: ${typeof firstStaff.revenue})`);
          console.log(`commission: ${firstStaff.commission} (type: ${typeof firstStaff.commission})`);
          console.log(`commissionEarned: ${firstStaff.commissionEarned} (type: ${typeof firstStaff.commissionEarned})`);
          console.log(`commissionPercentage: ${firstStaff.commissionPercentage} (type: ${typeof firstStaff.commissionPercentage})`);
        } else {
          console.log('No staff data returned');
        }
      } else {
        console.log('❌ Basic Staff Report API Failed:', basicResponse.data.message);
      }
    } catch (error) {
      console.error('❌ Basic Staff Report API Error:', error.response?.data || error.message);
    }
    
    // Test advanced staff metrics endpoint
    console.log('\n\n2. Testing advanced staff metrics endpoint:');
    console.log(`GET ${API_URL}/reports/advanced-staff?dateFrom=${dateFrom}&dateTo=${dateTo}`);
    
    try {
      const advancedResponse = await axios.get(
        `${API_URL}/reports/advanced-staff?dateFrom=${dateFrom}&dateTo=${dateTo}`,
        { headers }
      );
      
      if (advancedResponse.data.success) {
        console.log('✅ Advanced Staff Metrics API Success!');
        
        if (advancedResponse.data.data && advancedResponse.data.data.length > 0) {
          // Log the format of the first staff member's data
          const firstStaff = advancedResponse.data.data[0];
          console.log('\nSample Staff Data Format:');
          console.log(JSON.stringify(firstStaff, null, 2));
          
          // Specifically check commission fields
          console.log('\nCommission fields:');
          console.log(`staff_id: ${firstStaff.staff_id}`);
          console.log(`name: ${firstStaff.name}`);
          console.log(`revenue: ${firstStaff.revenue} (type: ${typeof firstStaff.revenue})`);
          console.log(`commissionEarned: ${firstStaff.commissionEarned} (type: ${typeof firstStaff.commissionEarned})`);
          console.log(`commission: ${firstStaff.commission} (type: ${typeof firstStaff.commission})`);
          console.log(`commissionPercentage: ${firstStaff.commissionPercentage} (type: ${typeof firstStaff.commissionPercentage})`);
        } else {
          console.log('No staff data returned');
        }
      } else {
        console.log('❌ Advanced Staff Metrics API Failed:', advancedResponse.data.message);
      }
    } catch (error) {
      console.error('❌ Advanced Staff Metrics API Error:', error.response?.data || error.message);
    }
    
    console.log('\n===== TEST COMPLETE =====');
    
  } catch (error) {
    console.error('Error running tests:', error.message);
  }
}

// Run the tests
testStaffReportFormats(); 