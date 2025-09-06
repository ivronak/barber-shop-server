const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN;

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

// Test functions
async function testRevenueReport() {
  try {
    
    
    
    const response = await axios.get(
      `${API_URL}/reports/revenue?dateFrom=${dateFrom}&dateTo=${dateTo}&groupBy=day`,
      { headers }
    );
    
    if (response.data.success) {
      
      
    } else {
      
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Revenue Report API Error:', error.response?.data || error.message);
    return null;
  }
}

async function testServicesReport() {
  try {
    
    
    
    const response = await axios.get(
      `${API_URL}/reports/services?dateFrom=${dateFrom}&dateTo=${dateTo}&sort=revenue_desc`,
      { headers }
    );
    
    if (response.data.success) {
      
      
    } else {
      
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Services Report API Error:', error.response?.data || error.message);
    return null;
  }
}

async function testStaffReport() {
  try {
    
    
    
    const response = await axios.get(
      `${API_URL}/reports/staff?dateFrom=${dateFrom}&dateTo=${dateTo}&sort=revenue_desc`,
      { headers }
    );
    
    if (response.data.success) {
      
      
    } else {
      
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Staff Report API Error:', error.response?.data || error.message);
    return null;
  }
}

async function testTipsDiscountsReport() {
  try {
    
    
    
    const response = await axios.get(
      `${API_URL}/reports/tips-discounts?dateFrom=${dateFrom}&dateTo=${dateTo}&groupBy=day`,
      { headers }
    );
    
    if (response.data.success) {
      
      
    } else {
      
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Tips & Discounts Report API Error:', error.response?.data || error.message);
    return null;
  }
}

async function testDashboardStats() {
  try {
    
    
    
    const response = await axios.get(
      `${API_URL}/reports/dashboard?period=weekly`,
      { headers }
    );
    
    if (response.data.success) {
      
      
    } else {
      
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Dashboard Stats API Error:', error.response?.data || error.message);
    return null;
  }
}

// Run tests
async function runTests() {
  
  
  if (!AUTH_TOKEN) {
    console.error('❌ No AUTH_TOKEN provided in environment variables');
    
    return;
  }

  try {
    await testDashboardStats();
    await testRevenueReport();
    await testServicesReport();
    await testStaffReport();
    await testTipsDiscountsReport();
    
    
  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
  }
}

// Execute tests
runTests();
