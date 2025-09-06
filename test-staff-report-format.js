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
    
    
    
    // Test basic staff report endpoint
    
    
    
    try {
      const basicResponse = await axios.get(
        `${API_URL}/reports/staff?dateFrom=${dateFrom}&dateTo=${dateTo}`,
        { headers }
      );
      
      if (basicResponse.data.success) {
        
        
        if (basicResponse.data.data && basicResponse.data.data.length > 0) {
          // Log the format of the first staff member's data
          const firstStaff = basicResponse.data.data[0];
          
          
          
          // Specifically check commission fields
          
          
          
          
          
          
          
        } else {
          
        }
      } else {
        
      }
    } catch (error) {
      console.error('❌ Basic Staff Report API Error:', error.response?.data || error.message);
    }
    
    // Test advanced staff metrics endpoint
    
    
    
    try {
      const advancedResponse = await axios.get(
        `${API_URL}/reports/advanced-staff?dateFrom=${dateFrom}&dateTo=${dateTo}`,
        { headers }
      );
      
      if (advancedResponse.data.success) {
        
        
        if (advancedResponse.data.data && advancedResponse.data.data.length > 0) {
          // Log the format of the first staff member's data
          const firstStaff = advancedResponse.data.data[0];
          
          
          
          // Specifically check commission fields
          
          
          
          
          
          
          
        } else {
          
        }
      } else {
        
      }
    } catch (error) {
      console.error('❌ Advanced Staff Metrics API Error:', error.response?.data || error.message);
    }
    
    
    
  } catch (error) {
    console.error('Error running tests:', error.message);
  }
}

// Run the tests
testStaffReportFormats(); 