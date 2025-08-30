/**
 * Test Auto-Generation of Invoices When Appointments Are Completed
 * 
 * This script tests the functionality that automatically generates invoices
 * when an appointment status is changed to "completed".
 */

require('dotenv').config();
const axios = require('axios');

// Configuration
const API_URL = process.env.API_URL || 'https://barber-shop-api-eight.vercel.app/api';
let TOKEN = '';

// Test user credentials (should be admin or staff)
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'admin@barbershop.com',
  password: process.env.TEST_USER_PASSWORD || 'admin123'
};

// API request helper with authentication and improved error handling
async function apiRequest(endpoint, method = 'GET', data = null, token = null) {
  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Add auth token if provided
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    console.log(`Making ${method} request to ${endpoint}`);
    
    const response = await axios({
      method,
      url: `${API_URL}${endpoint}`,
      headers,
      data,
      // Add timeout to avoid hanging requests
      timeout: 10000
    });
    
    console.log(`Response status: ${response.status}`);
    
    return { 
      success: true, 
      data: response.data,
      status: response.status 
    };
  } catch (error) {
    // Improved error logging
    console.error(`API Error (${method} ${endpoint}):`);
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(`Status: ${error.response.status}`);
      console.error(`Data:`, error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from server');
      console.error(error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error setting up request:', error.message);
    }
    
    return { 
      success: false, 
      error: error.response?.data || { message: error.message },
      status: error.response?.status 
    };
  }
}

// Login and get token
async function login(email, password) {
  const result = await apiRequest('/auth/login', 'POST', { email, password });
  if (result.success) {
    TOKEN = result.data.token;
    console.log(`Logged in as ${result.data.user.name} (${result.data.user.role})`);
    return true;
  } else {
    console.error('Login failed:', result.error);
    return false;
  }
}

// Create a test appointment if needed
async function createTestAppointment() {
  console.log('\n===== Creating Test Appointment =====');
  
  try {
    // First get a customer
    const customerResult = await apiRequest('/customers?limit=1', 'GET', null, TOKEN);
    if (!customerResult.success || !customerResult.data?.customers?.length) {
      console.log('No customers found to create appointment');
      return null;
    }
    
    const customer = customerResult.data.customers[0];
    console.log(`Found customer: ${customer.name} (${customer.id})`);
    
    // Get a staff member
    const staffResult = await apiRequest('/staff?limit=1', 'GET', null, TOKEN);
    if (!staffResult.success || !staffResult.data?.staff?.length) {
      console.log('No staff found to create appointment');
      return null;
    }
    
    const staff = staffResult.data.staff[0];
    console.log(`Found staff: ${staff.user?.name || 'Unknown'} (${staff.id})`);
    
    // Get a service
    const serviceResult = await apiRequest('/services?limit=1', 'GET', null, TOKEN);
    if (!serviceResult.success || !serviceResult.data?.services?.length) {
      console.log('No services found to create appointment');
      return null;
    }
    
    const service = serviceResult.data.services[0];
    console.log(`Found service: ${service.name} - $${service.price} (${service.id})`);
    
    // Create appointment for tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const appointmentDate = tomorrow.toISOString().split('T')[0];
    
    const appointmentData = {
      customer_id: customer.id,
      staff_id: staff.id,
      date: appointmentDate,
      time: "10:00:00",
      services: [service.id]
    };
    
    console.log(`Creating appointment for ${appointmentDate} at 10:00 AM`);
    
    const result = await apiRequest('/appointments', 'POST', appointmentData, TOKEN);
    
    if (result.success) {
      console.log('Test appointment created successfully with ID:', result.data.appointment.id);
      return result.data.appointment;
    } else {
      console.error('Failed to create test appointment:', result.error);
      return null;
    }
  } catch (error) {
    console.error('Error creating test appointment:', error);
    return null;
  }
}

// Find a scheduled appointment that can be marked as completed
async function findScheduledAppointment() {
  console.log('\n===== Finding Scheduled Appointment =====');
  
  try {
    // Try to get all appointments
    const result = await apiRequest('/appointments?limit=20', 'GET', null, TOKEN);
    
    if (result.success && result.data && result.data.appointments && result.data.appointments.length > 0) {
      console.log(`Found ${result.data.appointments.length} total appointments`);
      
      // Look for scheduled appointments
      const scheduledAppointments = result.data.appointments.filter(
        app => app.status === 'scheduled'
      );
      
      if (scheduledAppointments.length > 0) {
        console.log(`Found ${scheduledAppointments.length} scheduled appointments`);
        const selectedAppointment = scheduledAppointments[0];
        console.log(`Selected appointment ID: ${selectedAppointment.id}, Date: ${selectedAppointment.date}, Customer: ${selectedAppointment.customer_name}`);
        return selectedAppointment;
      }
      
      // Try with confirmed appointments if no scheduled ones exist
      const confirmedAppointments = result.data.appointments.filter(
        app => app.status === 'confirmed'
      );
      
      if (confirmedAppointments.length > 0) {
        console.log(`Found ${confirmedAppointments.length} confirmed appointments that can be completed`);
        const selectedAppointment = confirmedAppointments[0];
        console.log(`Selected appointment ID: ${selectedAppointment.id}, Date: ${selectedAppointment.date}, Customer: ${selectedAppointment.customer_name}`);
        return selectedAppointment;
      }
      
      console.log('No suitable appointments found to mark as completed');
      
      // Create a test appointment if none found
      return await createTestAppointment();
    } else {
      console.error('Error fetching appointments:', result.error?.message || 'Unknown error');
      // Try creating a test appointment
      return await createTestAppointment();
    }
  } catch (error) {
    console.error('Error finding scheduled appointment:', error);
    return await createTestAppointment();
  }
}

// Update appointment status to completed
async function markAppointmentAsCompleted(appointmentId) {
  console.log('\n===== Marking Appointment as Completed =====');
  
  try {
    console.log(`Updating appointment ${appointmentId} to 'completed' status`);
    
    const result = await apiRequest(`/appointments/${appointmentId}`, 'PUT', {
      status: 'completed'
    }, TOKEN);
    
    if (result.success) {
      console.log(`Appointment ${appointmentId} marked as completed successfully`);
      return result.data.appointment;
    } else {
      console.error('Failed to mark appointment as completed:', result.error);
      return null;
    }
  } catch (error) {
    console.error('Error marking appointment as completed:', error);
    return null;
  }
}

// Check if invoice was created for the appointment
async function checkInvoiceCreated(appointmentId) {
  console.log('\n===== Checking Auto-Created Invoice =====');
  
  try {
    // Find the invoice with the appointment ID
    const result = await apiRequest(`/invoices?limit=50`, 'GET', null, TOKEN);
    
    // Get invoices from response
    const invoices = result.data?.invoices || result.data?.data || [];
    
    if (result.success && invoices.length > 0) {
      console.log(`Found ${invoices.length} total invoices`);
      
      // Find invoice for this appointment
      const invoice = invoices.find(inv => inv.appointment_id === appointmentId);
      
      if (invoice) {
        console.log('\nInvoice was created automatically:');
        console.log(`- Invoice ID: ${invoice.id}`);
        console.log(`- Appointment ID: ${invoice.appointment_id}`);
        console.log(`- Customer: ${invoice.customer_name}`);
        console.log(`- Staff: ${invoice.staff_name}`);
        console.log(`- Subtotal: ${invoice.subtotal}`);
        console.log(`- Tax Rate: ${invoice.tax}%`);
        console.log(`- Tax Amount: ${invoice.tax_amount}`);
        console.log(`- Total: ${invoice.total}`);
        console.log(`- Status: ${invoice.status} (should be 'paid')`);
        console.log(`- Payment Method: ${invoice.payment_method} (should be 'cash')`);
        console.log(`- Date: ${invoice.date}`);
        
        // Verify that the status is set to 'paid' and payment method to 'cash'
        if (invoice.status !== 'paid') {
          console.warn(`WARNING: Invoice status is ${invoice.status}, but should be 'paid'`);
        }
        
        if (invoice.payment_method !== 'cash') {
          console.warn(`WARNING: Invoice payment method is ${invoice.payment_method}, but should be 'cash'`);
        }
        
        return invoice;
      } else {
        console.error(`No invoice found for appointment ID: ${appointmentId}`);
        return null;
      }
    } else {
      console.error('No invoices found or error fetching invoices:', result.error?.message);
      return null;
    }
  } catch (error) {
    console.error('Error checking for invoice:', error);
    return null;
  }
}

// Main test function
async function runTest() {
  console.log('===== Testing Auto-Invoice Generation =====');
  console.log(`API URL: ${API_URL}`);
  console.log(`Test user: ${TEST_USER.email}`);
  console.log('');
  
  try {
    // Step 1: Login
    const loggedIn = await login(TEST_USER.email, TEST_USER.password);
    if (!loggedIn) {
      console.error('Test failed: Could not log in');
      return false;
    }
    
    // Step 2: Find a scheduled appointment
    const appointment = await findScheduledAppointment();
    if (!appointment) {
      console.error('Test failed: Could not find or create an appointment');
      return false;
    }
    
    // Step 3: Mark appointment as completed
    const updatedAppointment = await markAppointmentAsCompleted(appointment.id);
    if (!updatedAppointment) {
      console.error('Test failed: Could not mark appointment as completed');
      return false;
    }
    
    // Step 4: Check if invoice was created
    const invoice = await checkInvoiceCreated(appointment.id);
    
    if (invoice) {
      console.log('\n===== TEST PASSED =====');
      console.log('Auto-invoice generation is working correctly!');
      return true;
    } else {
      console.log('\n===== TEST FAILED =====');
      console.log('No invoice was generated when appointment was marked as completed');
      return false;
    }
  } catch (error) {
    console.error('\n===== TEST ERROR =====');
    console.error('An unexpected error occurred:', error);
    return false;
  }
}

// Run the test
runTest()
  .then(success => {
    console.log(`\nTest completed with ${success ? 'SUCCESS' : 'FAILURE'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\nTest execution error:', error);
    process.exit(1);
  }); 