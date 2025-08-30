/**
 * Test script for staff dashboard API endpoint
 * 
 * This script tests the staff dashboard endpoint by:
 * 1. Logging in as a staff user
 * 2. Fetching the staff dashboard data
 * 3. Displaying the results
 */

require('dotenv').config();
const axios = require('axios');
const chalk = require('chalk');

const API_URL = process.env.API_URL || 'http://localhost:5000/api';
const STAFF_EMAIL = process.env.TEST_STAFF_EMAIL || 'james@barbershop.com';
const STAFF_PASSWORD = process.env.TEST_STAFF_PASSWORD || 'password123';

// Helper to format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

// Helper to format date
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Helper to log section headers
const logSection = (title) => {
  console.log(chalk.bold.blue('\n' + '='.repeat(50)));
  console.log(chalk.bold.blue(title));
  console.log(chalk.bold.blue('='.repeat(50)));
};

// Main test function
async function testStaffDashboard() {
  try {
    logSection('STAFF DASHBOARD API TEST');
    
    // Step 1: Login as staff
    console.log(chalk.yellow('Logging in as staff user...'));
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: STAFF_EMAIL,
      password: STAFF_PASSWORD
    });
    
    if (!loginResponse.data.success) {
      throw new Error('Login failed: ' + loginResponse.data.message);
    }
    
    const token = loginResponse.data.token;
    console.log(chalk.green('Login successful!'));
    console.log(`User: ${loginResponse.data.user.name} (${loginResponse.data.user.role})`);
    
    // Step 2: Fetch staff dashboard data
    console.log(chalk.yellow('\nFetching staff dashboard data...'));
    const dashboardResponse = await axios.get(`${API_URL}/dashboard/staff?period=weekly`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!dashboardResponse.data.success) {
      throw new Error('Failed to fetch dashboard data: ' + dashboardResponse.data.message);
    }
    
    const dashboardData = dashboardResponse.data.data;
    console.log(chalk.green('Dashboard data fetched successfully!'));
    
    // Step 3: Display staff information
    logSection('STAFF INFORMATION');
    const staffInfo = dashboardData.staffInfo;
    console.log(`Name: ${staffInfo.name}`);
    console.log(`Position: ${staffInfo.position}`);
    console.log(`Commission: ${staffInfo.commissionPercentage}%`);
    console.log(`Status: ${staffInfo.isAvailable ? 'Available' : 'Unavailable'}`);
    
    // Step 4: Display performance summary
    logSection('PERFORMANCE SUMMARY');
    const performance = dashboardData.performanceSummary;
    console.log(`Total Revenue: ${formatCurrency(performance.totalRevenue || 0)}`);
    console.log(`Total Tips: ${formatCurrency(performance.totalTips || 0)}`);
    console.log(`Total Appointments: ${performance.totalAppointments || 0}`);
    console.log(`Average Tip Percentage: ${(performance.avgTipPercentage || 0).toFixed(2)}%`);
    console.log(`Total Commission: ${formatCurrency(performance.totalCommission || 0)}`);
    
    // Step 5: Display service breakdown
    logSection('TOP SERVICES');
    if (dashboardData.serviceBreakdown && dashboardData.serviceBreakdown.length > 0) {
      dashboardData.serviceBreakdown.forEach(service => {
        console.log(`${service.service_name}: ${service.bookings} bookings, ${formatCurrency(service.revenue)}`);
      });
    } else {
      console.log('No service data available');
    }
    
    // Step 6: Display upcoming appointments
    logSection('UPCOMING APPOINTMENTS');
    if (dashboardData.upcomingAppointments && dashboardData.upcomingAppointments.length > 0) {
      dashboardData.upcomingAppointments.forEach(appointment => {
        console.log(`${formatDate(appointment.date)} at ${appointment.time} - ${appointment.customer.name}`);
      });
    } else {
      console.log('No upcoming appointments');
    }
    
    // Step 7: Display returning customers
    logSection('RETURNING CUSTOMERS');
    if (dashboardData.returnCustomers && dashboardData.returnCustomers.length > 0) {
      dashboardData.returnCustomers.forEach(customer => {
        console.log(`${customer.customer_name}: ${customer.visits} visits, ${formatCurrency(customer.spent)}`);
      });
    } else {
      console.log('No returning customers data available');
    }
    
    // Step 8: Display reviews
    logSection('RECENT REVIEWS');
    if (dashboardData.staffReviews && dashboardData.staffReviews.length > 0) {
      dashboardData.staffReviews.forEach(review => {
        console.log(`${review.customer.name} - ${review.rating}/5: ${review.comment}`);
      });
    } else {
      console.log('No reviews available');
    }
    
    console.log(chalk.green('\nTest completed successfully!'));
    
  } catch (error) {
    console.error(chalk.red('Error during test:'));
    if (error.response) {
      console.error(chalk.red(`Status: ${error.response.status}`));
      console.error(chalk.red('Response:'), error.response.data);
    } else {
      console.error(chalk.red(error.message));
    }
  }
}

// Run the test
testStaffDashboard(); 