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
    
    const response = await fetch(`${API_URL}${endpoint}`, options);
    const data = await response.json();
    
    
    
    
    return { success: response.ok, status: response.status, data };
  } catch (error) {
    console.error(`Error making request to ${endpoint}:`, error.message);
    return { success: false, error: error.message };
  }
}

// ===== Auth Tests =====
async function testRegisterUser() {
  
  const result = await apiRequest('/auth/register', 'POST', TEST_USER);
  
  if (result.success) {
    
    return true;
  } else {
    
    return false;
  }
}

async function testLogin() {
  
  const result = await apiRequest('/auth/login', 'POST', {
    email: TEST_USER.email,
    password: TEST_USER.password
  });
  
  if (result.success && result.data.token) {
    TOKEN = result.data.token;
    TEST_USER.id = result.data.user.id;
    
    
    return true;
  } else {
    
    return false;
  }
}

async function testGetCurrentUser() {
  
  const result = await apiRequest('/auth/me', 'GET', null, TOKEN);
  
  if (result.success) {
    
    return true;
  } else {
    
    return false;
  }
}

// ===== Services Tests =====
async function testCreateService() {
  
  const result = await apiRequest('/services', 'POST', TEST_SERVICE, TOKEN);
  
  if (result.success) {
    
    // Store service ID for future tests
    TEST_SERVICE.id = result.data.service.id;
    return true;
  } else {
    
    return false;
  }
}

async function testGetAllServices() {
  
  const result = await apiRequest('/services', 'GET', null, TOKEN);
  
  if (result.success) {
    
    return true;
  } else {
    
    return false;
  }
}

async function testGetServiceById() {
  if (!TEST_SERVICE.id) {
    
    return false;
  }

  
  const result = await apiRequest(`/services/${TEST_SERVICE.id}`, 'GET', null, TOKEN);
  
  if (result.success) {
    
    return true;
  } else {
    
    return false;
  }
}

async function testUpdateService() {
  if (!TEST_SERVICE.id) {
    
    return false;
  }

  
  const result = await apiRequest(`/services/${TEST_SERVICE.id}`, 'PUT', {
    name: `${TEST_SERVICE.name} Updated`,
    price: 30.00
  }, TOKEN);
  
  if (result.success) {
    
    return true;
  } else {
    
    return false;
  }
}

// ===== Staff Tests =====
async function testCreateStaff() {
  
  
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
    
    TEST_STAFF.id = result.data.staff.id;
    return true;
  } else {
    
    return false;
  }
}

async function testGetAllStaff() {
  
  const result = await apiRequest('/staff', 'GET', null, TOKEN);
  
  if (result.success) {
    
    return true;
  } else {
    
    return false;
  }
}

async function testGetStaffById() {
  if (!TEST_STAFF.id) {
    
    return false;
  }

  
  const result = await apiRequest(`/staff/${TEST_STAFF.id}`, 'GET', null, TOKEN);
  
  if (result.success) {
    
    return true;
  } else {
    
    return false;
  }
}

async function testUpdateStaffAvailability() {
  if (!TEST_STAFF.id) {
    
    return false;
  }

  
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
    
    return true;
  } else {
    
    return false;
  }
}

// ===== Customer Tests =====
async function testCreateCustomer() {
  
  const result = await apiRequest('/customers', 'POST', TEST_CUSTOMER, TOKEN);
  
  if (result.success) {
    
    TEST_CUSTOMER.id = result.data.customer.id;
    return true;
  } else {
    
    return false;
  }
}

async function testGetAllCustomers() {
  
  const result = await apiRequest('/customers', 'GET', null, TOKEN);
  
  if (result.success) {
    
    return true;
  } else {
    
    return false;
  }
}

async function testGetCustomerById() {
  if (!TEST_CUSTOMER.id) {
    
    return false;
  }

  
  const result = await apiRequest(`/customers/${TEST_CUSTOMER.id}`, 'GET', null, TOKEN);
  
  if (result.success) {
    
    return true;
  } else {
    
    return false;
  }
}

async function testUpdateCustomer() {
  if (!TEST_CUSTOMER.id) {
    
    return false;
  }

  
  const result = await apiRequest(`/customers/${TEST_CUSTOMER.id}`, 'PUT', {
    name: `${TEST_CUSTOMER.name} Updated`,
    notes: 'Updated customer notes'
  }, TOKEN);
  
  if (result.success) {
    
    return true;
  } else {
    
    return false;
  }
}

// ===== Appointment Tests =====
async function testCreateAppointment() {
  if (!TEST_CUSTOMER.id || !TEST_STAFF.id || !TEST_SERVICE.id) {
    
    return false;
  }

  
  
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
    
    TEST_APPOINTMENT.id = result.data.appointment.id;
    return true;
  } else {
    
    return false;
  }
}

async function testGetAllAppointments() {
  
  const result = await apiRequest('/appointments', 'GET', null, TOKEN);
  
  if (result.success) {
    
    return true;
  } else {
    
    return false;
  }
}

async function testGetAppointmentById() {
  if (!TEST_APPOINTMENT.id) {
    
    return false;
  }

  
  const result = await apiRequest(`/appointments/${TEST_APPOINTMENT.id}`, 'GET', null, TOKEN);
  
  if (result.success) {
    
    return true;
  } else {
    
    return false;
  }
}

async function testUpdateAppointment() {
  if (!TEST_APPOINTMENT.id) {
    
    return false;
  }

  
  const result = await apiRequest(`/appointments/${TEST_APPOINTMENT.id}`, 'PUT', {
    status: 'confirmed',
    notes: 'Updated appointment notes'
  }, TOKEN);
  
  if (result.success) {
    
    return true;
  } else {
    
    return false;
  }
}

// ===== Invoice Tests =====
async function testCreateInvoice() {
  if (!TEST_CUSTOMER.id || !TEST_STAFF.id || !TEST_SERVICE.id || !TEST_APPOINTMENT.id) {
    
    return false;
  }

  
  
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
    
    TEST_INVOICE.id = result.data.invoice.id;
    return true;
  } else {
    
    return false;
  }
}

async function testGetAllInvoices() {
  
  const result = await apiRequest('/invoices', 'GET', null, TOKEN);
  
  if (result.success) {
    
    return true;
  } else {
    
    return false;
  }
}

async function testGetInvoiceById() {
  if (!TEST_INVOICE.id) {
    
    return false;
  }

  
  const result = await apiRequest(`/invoices/${TEST_INVOICE.id}`, 'GET', null, TOKEN);
  
  if (result.success) {
    
    return true;
  } else {
    
    return false;
  }
}

async function testUpdateInvoice() {
  if (!TEST_INVOICE.id) {
    
    return false;
  }

  
  const result = await apiRequest(`/invoices/${TEST_INVOICE.id}`, 'PUT', {
    status: 'paid',
    payment_method: 'cash'
  }, TOKEN);
  
  if (result.success) {
    
    return true;
  } else {
    
    return false;
  }
}

// ===== Settings Tests =====
async function testGetSettings() {
  
  const result = await apiRequest('/settings', 'GET', null, TOKEN);
  
  if (result.success) {
    
    return true;
  } else {
    
    return false;
  }
}

async function testUpdateSettings() {
  
  const result = await apiRequest('/settings', 'PUT', TEST_BUSINESS_SETTINGS, TOKEN);
  
  if (result.success) {
    
    return true;
  } else {
    
    return false;
  }
}

// ===== Reports Tests =====
async function testGetDashboardStats() {
  
  const result = await apiRequest('/reports/dashboard?period=weekly', 'GET', null, TOKEN);
  
  if (result.success) {
    
    return true;
  } else {
    
    return false;
  }
}

// ===== Public API Tests =====
async function testPublicBusinessInfo() {
  
  const result = await apiRequest('/public/business', 'GET');
  
  if (result.success) {
    
    return true;
  } else {
    
    return false;
  }
}

async function testPublicServices() {
  
  const result = await apiRequest('/public/services', 'GET');
  
  if (result.success) {
    
    return true;
  } else {
    
    return false;
  }
}

async function testSubmitContactForm() {
  
  const contactData = {
    name: 'Contact Test',
    email: 'contact@test.com',
    phone: '555-111-2222',
    message: 'This is a test contact message'
  };
  
  const result = await apiRequest('/public/contact', 'POST', contactData);
  
  if (result.success) {
    
    return true;
  } else {
    
    return false;
  }
}

// Run all tests
async function runTests() {
  try {
    
    
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
    
    
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Run the tests
runTests(); 