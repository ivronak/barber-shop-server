const fetch = require('node-fetch');

const API_URL = 'http://localhost:5000/api';
let TOKEN = '';

// Test settings
const TEST_USER = {
  name: 'Test Admin',
  email: 'testadmin@example.com',
  password: 'password123',
  phone: '555-123-4567',
  role: 'admin'
};

const TEST_SERVICE = {
  name: 'Test Haircut',
  description: 'A test haircut service',
  price: 25.00,
  duration: 30,
  category: 'haircuts'
};

const TEST_CUSTOMER = {
  name: 'Test Customer',
  email: 'testcustomer@example.com',
  phone: '555-987-6543',
  notes: 'This is a test customer'
};

const TEST_STAFF = {
  position: 'Test Barber',
  bio: 'This is a test barber',
  commission_percentage: 20,
  is_available: true
};

const TEST_APPOINTMENT = {
  date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
  time: '14:00',
  notes: 'Test appointment'
};

const TEST_INVOICE = {
  date: new Date().toISOString().split('T')[0],
  subtotal: 25.00,
  tax: 7.5,
  tax_amount: 1.88,
  total: 26.88,
  payment_method: 'card',
  status: 'paid',
  notes: 'Test invoice'
};

const TEST_BUSINESS_SETTINGS = {
  name: 'Test Barber Shop',
  address: '123 Test Street',
  phone: '555-123-0000',
  email: 'info@testbarbershop.com',
  tax_rate: 7.5,
  slot_duration: 30,
  default_commission: 20
};

// Helper function for API requests
async function apiRequest(endpoint, method = 'GET', body = null, token = null) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  };

  try {
    console.log(`Making ${method} request to ${endpoint}`);
    const response = await fetch(`${API_URL}${endpoint}`, options);
    const data = await response.json();
    
    console.log(`Response status: ${response.status}`);
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    return { success: response.ok, status: response.status, data };
  } catch (error) {
    console.error(`Error making request to ${endpoint}:`, error.message);
    return { success: false, error: error.message };
  }
}

// ===== Auth Tests =====
async function testRegisterUser() {
  console.log('\n===== Testing User Registration =====');
  const result = await apiRequest('/auth/register', 'POST', TEST_USER);
  
  if (result.success) {
    console.log('User registration successful');
    return true;
  } else {
    console.log('User registration failed - this might be OK if user already exists');
    return false;
  }
}

async function testLogin() {
  console.log('\n===== Testing User Login =====');
  const result = await apiRequest('/auth/login', 'POST', {
    email: TEST_USER.email,
    password: TEST_USER.password
  });
  
  if (result.success && result.data.token) {
    TOKEN = result.data.token;
    TEST_USER.id = result.data.user.id;
    console.log('Login successful');
    console.log('JWT Token received (first 20 chars):', TOKEN.substring(0, 20) + '...');
    return true;
  } else {
    console.log('Login failed');
    return false;
  }
}

async function testGetCurrentUser() {
  console.log('\n===== Testing Get Current User =====');
  const result = await apiRequest('/auth/me', 'GET', null, TOKEN);
  
  if (result.success) {
    console.log('Got current user info successfully');
    return true;
  } else {
    console.log('Failed to get current user info');
    return false;
  }
}

// ===== Services Tests =====
async function testCreateService() {
  console.log('\n===== Testing Create Service =====');
  const result = await apiRequest('/services', 'POST', TEST_SERVICE, TOKEN);
  
  if (result.success) {
    console.log('Service created successfully');
    // Store service ID for future tests
    TEST_SERVICE.id = result.data.service.id;
    return true;
  } else {
    console.log('Failed to create service');
    return false;
  }
}

async function testGetAllServices() {
  console.log('\n===== Testing Get All Services =====');
  const result = await apiRequest('/services', 'GET', null, TOKEN);
  
  if (result.success) {
    console.log(`Got ${result.data.services.length} services successfully`);
    return true;
  } else {
    console.log('Failed to get services');
    return false;
  }
}

async function testGetServiceById() {
  if (!TEST_SERVICE.id) {
    console.log('No service ID available for testing');
    return false;
  }

  console.log('\n===== Testing Get Service By ID =====');
  const result = await apiRequest(`/services/${TEST_SERVICE.id}`, 'GET', null, TOKEN);
  
  if (result.success) {
    console.log('Got service by ID successfully');
    return true;
  } else {
    console.log('Failed to get service by ID');
    return false;
  }
}

async function testUpdateService() {
  if (!TEST_SERVICE.id) {
    console.log('No service ID available for testing');
    return false;
  }

  console.log('\n===== Testing Update Service =====');
  const result = await apiRequest(`/services/${TEST_SERVICE.id}`, 'PUT', {
    name: `${TEST_SERVICE.name} Updated`,
    price: 30.00
  }, TOKEN);
  
  if (result.success) {
    console.log('Service updated successfully');
    return true;
  } else {
    console.log('Failed to update service');
    return false;
  }
}

// ===== Staff Tests =====
async function testCreateStaff() {
  console.log('\n===== Testing Create Staff =====');
  
  // Create the staff record with all required fields
  const staffData = {
    ...TEST_STAFF,
    name: 'Test Staff Member',
    email: 'teststaff@example.com',
    password: 'password123',
    phone: '555-777-8888'
  };
  
  const result = await apiRequest('/staff', 'POST', staffData, TOKEN);
  
  if (result.success) {
    console.log('Staff created successfully');
    TEST_STAFF.id = result.data.staff.id;
    return true;
  } else {
    console.log('Failed to create staff');
    return false;
  }
}

async function testGetAllStaff() {
  console.log('\n===== Testing Get All Staff =====');
  const result = await apiRequest('/staff', 'GET', null, TOKEN);
  
  if (result.success) {
    console.log(`Got ${result.data.staff.length} staff members successfully`);
    return true;
  } else {
    console.log('Failed to get staff');
    return false;
  }
}

async function testGetStaffById() {
  if (!TEST_STAFF.id) {
    console.log('No staff ID available for testing');
    return false;
  }

  console.log('\n===== Testing Get Staff By ID =====');
  const result = await apiRequest(`/staff/${TEST_STAFF.id}`, 'GET', null, TOKEN);
  
  if (result.success) {
    console.log('Got staff by ID successfully');
    return true;
  } else {
    console.log('Failed to get staff by ID');
    return false;
  }
}

async function testUpdateStaffAvailability() {
  if (!TEST_STAFF.id) {
    console.log('No staff ID available for testing');
    return false;
  }

  console.log('\n===== Testing Update Staff Availability =====');
  const workingHours = {
    workingHours: [
      {
        day_of_week: 'monday',
        start_time: '09:00',
        end_time: '17:00',
        is_break: false
      },
      {
        day_of_week: 'monday',
        start_time: '12:00',
        end_time: '13:00',
        is_break: true
      }
    ]
  };
  
  const result = await apiRequest(`/staff/${TEST_STAFF.id}/availability`, 'PUT', workingHours, TOKEN);
  
  if (result.success) {
    console.log('Staff availability updated successfully');
    return true;
  } else {
    console.log('Failed to update staff availability');
    return false;
  }
}

// ===== Customer Tests =====
async function testCreateCustomer() {
  console.log('\n===== Testing Create Customer =====');
  const result = await apiRequest('/customers', 'POST', TEST_CUSTOMER, TOKEN);
  
  if (result.success) {
    console.log('Customer created successfully');
    TEST_CUSTOMER.id = result.data.customer.id;
    return true;
  } else {
    console.log('Failed to create customer');
    return false;
  }
}

async function testGetAllCustomers() {
  console.log('\n===== Testing Get All Customers =====');
  const result = await apiRequest('/customers', 'GET', null, TOKEN);
  
  if (result.success) {
    console.log(`Got ${result.data.customers.length} customers successfully`);
    return true;
  } else {
    console.log('Failed to get customers');
    return false;
  }
}

async function testGetCustomerById() {
  if (!TEST_CUSTOMER.id) {
    console.log('No customer ID available for testing');
    return false;
  }

  console.log('\n===== Testing Get Customer By ID =====');
  const result = await apiRequest(`/customers/${TEST_CUSTOMER.id}`, 'GET', null, TOKEN);
  
  if (result.success) {
    console.log('Got customer by ID successfully');
    return true;
  } else {
    console.log('Failed to get customer by ID');
    return false;
  }
}

async function testUpdateCustomer() {
  if (!TEST_CUSTOMER.id) {
    console.log('No customer ID available for testing');
    return false;
  }

  console.log('\n===== Testing Update Customer =====');
  const result = await apiRequest(`/customers/${TEST_CUSTOMER.id}`, 'PUT', {
    name: `${TEST_CUSTOMER.name} Updated`,
    notes: 'Updated customer notes'
  }, TOKEN);
  
  if (result.success) {
    console.log('Customer updated successfully');
    return true;
  } else {
    console.log('Failed to update customer');
    return false;
  }
}

// ===== Appointment Tests =====
async function testCreateAppointment() {
  if (!TEST_CUSTOMER.id || !TEST_STAFF.id || !TEST_SERVICE.id) {
    console.log('Missing required IDs for appointment creation');
    return false;
  }

  console.log('\n===== Testing Create Appointment =====');
  
  const appointmentData = {
    ...TEST_APPOINTMENT,
    customer_id: TEST_CUSTOMER.id,
    staff_id: TEST_STAFF.id,
    customer_name: TEST_CUSTOMER.name,
    customer_phone: TEST_CUSTOMER.phone,
    customer_email: TEST_CUSTOMER.email,
    staff_name: TEST_USER.name,
    services: [
      {
        service_id: TEST_SERVICE.id,
        service_name: TEST_SERVICE.name,
        price: TEST_SERVICE.price,
        duration: TEST_SERVICE.duration
      }
    ],
    total_amount: TEST_SERVICE.price
  };
  
  const result = await apiRequest('/appointments', 'POST', appointmentData, TOKEN);
  
  if (result.success) {
    console.log('Appointment created successfully');
    TEST_APPOINTMENT.id = result.data.appointment.id;
    return true;
  } else {
    console.log('Failed to create appointment');
    return false;
  }
}

async function testGetAllAppointments() {
  console.log('\n===== Testing Get All Appointments =====');
  const result = await apiRequest('/appointments', 'GET', null, TOKEN);
  
  if (result.success) {
    console.log(`Got ${result.data.appointments.length} appointments successfully`);
    return true;
  } else {
    console.log('Failed to get appointments');
    return false;
  }
}

async function testGetAppointmentById() {
  if (!TEST_APPOINTMENT.id) {
    console.log('No appointment ID available for testing');
    return false;
  }

  console.log('\n===== Testing Get Appointment By ID =====');
  const result = await apiRequest(`/appointments/${TEST_APPOINTMENT.id}`, 'GET', null, TOKEN);
  
  if (result.success) {
    console.log('Got appointment by ID successfully');
    return true;
  } else {
    console.log('Failed to get appointment by ID');
    return false;
  }
}

async function testUpdateAppointment() {
  if (!TEST_APPOINTMENT.id) {
    console.log('No appointment ID available for testing');
    return false;
  }

  console.log('\n===== Testing Update Appointment =====');
  const result = await apiRequest(`/appointments/${TEST_APPOINTMENT.id}`, 'PUT', {
    status: 'confirmed',
    notes: 'Updated appointment notes'
  }, TOKEN);
  
  if (result.success) {
    console.log('Appointment updated successfully');
    return true;
  } else {
    console.log('Failed to update appointment');
    return false;
  }
}

// ===== Invoice Tests =====
async function testCreateInvoice() {
  if (!TEST_CUSTOMER.id || !TEST_STAFF.id || !TEST_SERVICE.id || !TEST_APPOINTMENT.id) {
    console.log('Missing required IDs for invoice creation');
    return false;
  }

  console.log('\n===== Testing Create Invoice =====');
  
  const invoiceData = {
    ...TEST_INVOICE,
    appointment_id: TEST_APPOINTMENT.id,
    customer_id: TEST_CUSTOMER.id,
    staff_id: TEST_STAFF.id,
    customer_name: TEST_CUSTOMER.name,
    staff_name: TEST_USER.name,
    services: [
      {
        service_id: TEST_SERVICE.id,
        service_name: TEST_SERVICE.name,
        price: TEST_SERVICE.price,
        quantity: 1,
        total: TEST_SERVICE.price
      }
    ],
    tax_components: [
      {
        name: 'GST',
        rate: 7.5,
        amount: 1.88
      }
    ]
  };
  
  const result = await apiRequest('/invoices', 'POST', invoiceData, TOKEN);
  
  if (result.success) {
    console.log('Invoice created successfully');
    TEST_INVOICE.id = result.data.invoice.id;
    return true;
  } else {
    console.log('Failed to create invoice');
    return false;
  }
}

async function testGetAllInvoices() {
  console.log('\n===== Testing Get All Invoices =====');
  const result = await apiRequest('/invoices', 'GET', null, TOKEN);
  
  if (result.success) {
    console.log(`Got ${result.data.invoices.length} invoices successfully`);
    return true;
  } else {
    console.log('Failed to get invoices');
    return false;
  }
}

async function testGetInvoiceById() {
  if (!TEST_INVOICE.id) {
    console.log('No invoice ID available for testing');
    return false;
  }

  console.log('\n===== Testing Get Invoice By ID =====');
  const result = await apiRequest(`/invoices/${TEST_INVOICE.id}`, 'GET', null, TOKEN);
  
  if (result.success) {
    console.log('Got invoice by ID successfully');
    return true;
  } else {
    console.log('Failed to get invoice by ID');
    return false;
  }
}

async function testUpdateInvoice() {
  if (!TEST_INVOICE.id) {
    console.log('No invoice ID available for testing');
    return false;
  }

  console.log('\n===== Testing Update Invoice =====');
  const result = await apiRequest(`/invoices/${TEST_INVOICE.id}`, 'PUT', {
    status: 'paid',
    payment_method: 'cash'
  }, TOKEN);
  
  if (result.success) {
    console.log('Invoice updated successfully');
    return true;
  } else {
    console.log('Failed to update invoice');
    return false;
  }
}

// ===== Settings Tests =====
async function testGetSettings() {
  console.log('\n===== Testing Get Business Settings =====');
  const result = await apiRequest('/settings', 'GET', null, TOKEN);
  
  if (result.success) {
    console.log('Got business settings successfully');
    return true;
  } else {
    console.log('Failed to get business settings');
    return false;
  }
}

async function testUpdateSettings() {
  console.log('\n===== Testing Update Business Settings =====');
  const result = await apiRequest('/settings', 'PUT', TEST_BUSINESS_SETTINGS, TOKEN);
  
  if (result.success) {
    console.log('Business settings updated successfully');
    return true;
  } else {
    console.log('Failed to update business settings');
    return false;
  }
}

// ===== Reports Tests =====
async function testGetDashboardStats() {
  console.log('\n===== Testing Get Dashboard Statistics =====');
  const result = await apiRequest('/reports/dashboard?period=weekly', 'GET', null, TOKEN);
  
  if (result.success) {
    console.log('Got dashboard statistics successfully');
    return true;
  } else {
    console.log('Failed to get dashboard statistics');
    return false;
  }
}

// ===== Public API Tests =====
async function testPublicBusinessInfo() {
  console.log('\n===== Testing Public Business Info =====');
  const result = await apiRequest('/public/business', 'GET');
  
  if (result.success) {
    console.log('Got public business info successfully');
    return true;
  } else {
    console.log('Failed to get public business info');
    return false;
  }
}

async function testPublicServices() {
  console.log('\n===== Testing Public Services =====');
  const result = await apiRequest('/public/services', 'GET');
  
  if (result.success) {
    console.log('Got public services successfully');
    return true;
  } else {
    console.log('Failed to get public services');
    return false;
  }
}

async function testSubmitContactForm() {
  console.log('\n===== Testing Submit Contact Form =====');
  const contactData = {
    name: 'Contact Test',
    email: 'contact@test.com',
    phone: '555-111-2222',
    message: 'This is a test contact message'
  };
  
  const result = await apiRequest('/public/contact', 'POST', contactData);
  
  if (result.success) {
    console.log('Contact form submitted successfully');
    return true;
  } else {
    console.log('Failed to submit contact form');
    return false;
  }
}

// Run all tests
async function runTests() {
  try {
    console.log('Starting comprehensive API tests...');
    
    // Auth tests
    await testRegisterUser();
    const loginSuccess = await testLogin();
    
    if (!loginSuccess) {
      console.error('Login failed, cannot continue with authenticated tests');
      return;
    }
    
    await testGetCurrentUser();
    
    // Service tests
    await testCreateService();
    await testGetAllServices();
    await testGetServiceById();
    await testUpdateService();
    
    // Staff tests
    await testCreateStaff();
    await testGetAllStaff();
    await testGetStaffById();
    await testUpdateStaffAvailability();
    
    // Customer tests
    await testCreateCustomer();
    await testGetAllCustomers();
    await testGetCustomerById();
    await testUpdateCustomer();
    
    // Appointment tests
    await testCreateAppointment();
    await testGetAllAppointments();
    await testGetAppointmentById();
    await testUpdateAppointment();
    
    // Invoice tests
    await testCreateInvoice();
    await testGetAllInvoices();
    await testGetInvoiceById();
    await testUpdateInvoice();
    
    // Settings tests
    await testGetSettings();
    await testUpdateSettings();
    
    // Reports tests
    await testGetDashboardStats();
    
    // Public API tests
    await testPublicBusinessInfo();
    await testPublicServices();
    await testSubmitContactForm();
    
    console.log('\n===== All tests completed =====');
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Run the tests
runTests(); 