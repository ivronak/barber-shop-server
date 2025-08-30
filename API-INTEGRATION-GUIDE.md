# Barber Shop Management API - Frontend Integration Guide

## Overview

This document provides guidelines for integrating frontend applications with the Barber Shop Management API. It covers authentication, available endpoints, request/response formats, and includes examples using fetch API.

## Base URL

```
http://localhost:5000/api
```

For production, replace with your deployed API URL.

## Authentication

The API uses JWT (JSON Web Token) for authentication.

### Login

```javascript
// Example login request
async function login(email, password) {
  try {
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Store token in localStorage or secure cookie
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      return data;
    } else {
      throw new Error(data.message || 'Login failed');
    }
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}
```

### Making Authenticated Requests

```javascript
// Example authenticated request
async function fetchData(endpoint, method = 'GET', body = null) {
  const token = localStorage.getItem('token');
  
  if (!token) {
    throw new Error('No authentication token found');
  }
  
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };
    
    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`http://localhost:5000/api${endpoint}`, options);
    const data = await response.json();
    
    if (response.ok) {
      return data;
    } else {
      throw new Error(data.message || 'Request failed');
    }
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    throw error;
  }
}
```

## Common Response Format

All API responses follow a standard format:

```javascript
// Success response
{
  "success": true,
  "data/entity": {...} // or array of entities
}

// Error response
{
  "success": false,
  "message": "Error description"
}
```

## API Endpoints Reference

### Authentication

#### Login
- **URL**: `/auth/login`
- **Method**: `POST`
- **Body**: `{ "email": string, "password": string }`
- **Response**: `{ "success": true, "token": string, "user": User }`

#### Register (Admin only)
- **URL**: `/auth/register`
- **Method**: `POST`
- **Auth Required**: Yes
- **Body**: `{ "name": string, "email": string, "password": string, "phone": string, "role": string }`
- **Response**: `{ "success": true, "token": string, "user": User }`

#### Get Current User
- **URL**: `/auth/me`
- **Method**: `GET`
- **Auth Required**: Yes
- **Response**: `{ "success": true, "user": User }`

### Staff Management

#### Get All Staff
- **URL**: `/staff`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Parameters**: `sort`, `limit`, `page`
- **Response**: `{ "success": true, "staff": Staff[], "totalCount": number, "pages": number }`

#### Get Staff by ID
- **URL**: `/staff/:id`
- **Method**: `GET`
- **Auth Required**: Yes
- **Response**: `{ "success": true, "staff": Staff }`

#### Create Staff
- **URL**: `/staff`
- **Method**: `POST`
- **Auth Required**: Yes (Admin only)
- **Body**:
```javascript
{
  "name": "Staff Name",
  "email": "staff@example.com",
  "password": "password",
  "phone": "555-123-4567",
  "position": "Barber",
  "bio": "Staff bio",
  "commission_percentage": 20,
  "is_available": true,
  "services": ["service-id-1", "service-id-2"] // Optional
}
```
- **Response**: `{ "success": true, "staff": Staff }`

#### Update Staff
- **URL**: `/staff/:id`
- **Method**: `PUT`
- **Auth Required**: Yes (Admin only)
- **Response**: `{ "success": true, "staff": Staff }`

#### Delete Staff
- **URL**: `/staff/:id`
- **Method**: `DELETE`
- **Auth Required**: Yes (Admin only)
- **Response**: `{ "success": true, "message": "Staff member deleted successfully" }`

#### Update Staff Availability
- **URL**: `/staff/:id/availability`
- **Method**: `PUT`
- **Auth Required**: Yes
- **Body**:
```javascript
{
  "workingHours": [
    {
      "day_of_week": "monday",
      "start_time": "09:00",
      "end_time": "17:00",
      "is_break": false
    },
    {
      "day_of_week": "monday",
      "start_time": "12:00",
      "end_time": "13:00",
      "is_break": true
    }
  ]
}
```
- **Response**: `{ "success": true, "workingHours": WorkingHours[] }`

### Services

#### Get All Services
- **URL**: `/services`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Parameters**: `category`, `sort`, `limit`, `page`
- **Response**: `{ "success": true, "services": Service[], "totalCount": number, "pages": number }`

#### Get Service by ID
- **URL**: `/services/:id`
- **Method**: `GET`
- **Auth Required**: Yes
- **Response**: `{ "success": true, "service": Service }`

#### Create Service
- **URL**: `/services`
- **Method**: `POST`
- **Auth Required**: Yes (Admin only)
- **Body**:
```javascript
{
  "name": "Service Name",
  "description": "Service description",
  "price": 25.00,
  "duration": 30,
  "category": "haircuts"
}
```
- **Response**: `{ "success": true, "service": Service }`

#### Update Service
- **URL**: `/services/:id`
- **Method**: `PUT`
- **Auth Required**: Yes (Admin only)
- **Response**: `{ "success": true, "service": Service }`

#### Delete Service
- **URL**: `/services/:id`
- **Method**: `DELETE`
- **Auth Required**: Yes (Admin only)
- **Response**: `{ "success": true, "message": "Service deleted successfully" }`

### Customers

#### Get All Customers
- **URL**: `/customers`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Parameters**: `search`, `sort`, `limit`, `page`
- **Response**: `{ "success": true, "customers": Customer[], "totalCount": number, "pages": number }`

#### Get Customer by ID
- **URL**: `/customers/:id`
- **Method**: `GET`
- **Auth Required**: Yes
- **Response**: `{ "success": true, "customer": Customer }`

#### Create Customer
- **URL**: `/customers`
- **Method**: `POST`
- **Auth Required**: Yes
- **Body**:
```javascript
{
  "name": "Customer Name",
  "email": "customer@example.com",
  "phone": "555-987-6543",
  "notes": "Customer notes"
}
```
- **Response**: `{ "success": true, "customer": Customer }`

#### Update Customer
- **URL**: `/customers/:id`
- **Method**: `PUT`
- **Auth Required**: Yes
- **Response**: `{ "success": true, "customer": Customer }`

#### Get Customer Appointments
- **URL**: `/customers/:id/appointments`
- **Method**: `GET`
- **Auth Required**: Yes
- **Response**: `{ "success": true, "appointments": Appointment[] }`

#### Get Customer Invoices
- **URL**: `/customers/:id/invoices`
- **Method**: `GET`
- **Auth Required**: Yes
- **Response**: `{ "success": true, "invoices": Invoice[] }`

### Appointments

#### Get All Appointments
- **URL**: `/appointments`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Parameters**: `date`, `staffId`, `customerId`, `status`, `sort`, `limit`, `page`
- **Response**: `{ "success": true, "appointments": Appointment[], "totalCount": number, "pages": number }`

#### Get Appointment by ID
- **URL**: `/appointments/:id`
- **Method**: `GET`
- **Auth Required**: Yes
- **Response**: `{ "success": true, "appointment": Appointment }`

#### Create Appointment
- **URL**: `/appointments`
- **Method**: `POST`
- **Auth Required**: Yes
- **Body**:
```javascript
{
  "customer_id": "customer-id",
  "staff_id": "staff-id",
  "date": "2025-06-10",
  "time": "14:00",
  "customer_name": "Customer Name",
  "customer_phone": "555-987-6543",
  "customer_email": "customer@example.com",
  "staff_name": "Staff Name",
  "services": [
    {
      "service_id": "service-id",
      "service_name": "Service Name",
      "price": 25.00,
      "duration": 30
    }
  ],
  "total_amount": 25.00,
  "notes": "Appointment notes",
  "status": "scheduled"
}
```
- **Response**: `{ "success": true, "appointment": Appointment }`

#### Update Appointment
- **URL**: `/appointments/:id`
- **Method**: `PUT`
- **Auth Required**: Yes
- **Response**: `{ "success": true, "appointment": Appointment }`

#### Cancel Appointment
- **URL**: `/appointments/:id`
- **Method**: `DELETE`
- **Auth Required**: Yes
- **Response**: `{ "success": true, "message": "Appointment cancelled successfully" }`

#### Reschedule Appointment
- **URL**: `/appointments/:id/reschedule`
- **Method**: `POST`
- **Auth Required**: Yes
- **Body**:
```javascript
{
  "date": "2025-06-12",
  "time": "15:30"
}
```
- **Response**: `{ "success": true, "appointment": Appointment }`

#### Get Available Slots
- **URL**: `/appointments/available-slots`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Parameters**: `date`, `staffId`, `serviceId`
- **Response**: `{ "success": true, "slots": [{ "time": string, "available": boolean }] }`

### Invoices

#### Get All Invoices
- **URL**: `/invoices`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Parameters**: `dateFrom`, `dateTo`, `staffId`, `customerId`, `status`, `sort`, `limit`, `page`
- **Response**: `{ "success": true, "invoices": Invoice[], "totalCount": number, "pages": number }`

#### Get Invoice by ID
- **URL**: `/invoices/:id`
- **Method**: `GET`
- **Auth Required**: Yes
- **Response**: `{ "success": true, "invoice": Invoice }`

#### Create Invoice
- **URL**: `/invoices`
- **Method**: `POST`
- **Auth Required**: Yes
- **Body**:
```javascript
{
  "appointment_id": "appointment-id", // Optional
  "customer_id": "customer-id",
  "staff_id": "staff-id",
  "date": "2025-06-10",
  "customer_name": "Customer Name",
  "staff_name": "Staff Name",
  "subtotal": 25.00,
  "discount_type": "percentage", // Optional: "percentage" or "fixed"
  "discount_value": 10, // Optional
  "discount_amount": 2.50, // Optional
  "tip_amount": 5.00, // Optional
  "tax": 7.5,
  "tax_amount": 1.88,
  "total": 29.38,
  "payment_method": "card", // "cash", "card", "mobile", or "pending"
  "status": "paid", // "paid", "pending", or "cancelled"
  "notes": "Invoice notes", // Optional
  "services": [
    {
      "service_id": "service-id",
      "service_name": "Service Name",
      "price": 25.00,
      "quantity": 1,
      "total": 25.00
    }
  ],
  "tax_components": [ // Optional
    {
      "name": "GST",
      "rate": 7.5,
      "amount": 1.88
    }
  ]
}
```
- **Response**: `{ "success": true, "invoice": Invoice }`

#### Update Invoice
- **URL**: `/invoices/:id`
- **Method**: `PUT`
- **Auth Required**: Yes
- **Response**: `{ "success": true, "invoice": Invoice }`

#### Send Invoice
- **URL**: `/invoices/:id/send`
- **Method**: `POST`
- **Auth Required**: Yes
- **Response**: `{ "success": true, "message": "Invoice sent successfully" }`

### Business Settings

#### Get Settings
- **URL**: `/settings`
- **Method**: `GET`
- **Auth Required**: Yes
- **Response**: `{ "success": true, "settings": BusinessSettings }`

#### Update Settings
- **URL**: `/settings`
- **Method**: `PUT`
- **Auth Required**: Yes (Admin only)
- **Body**:
```javascript
{
  "name": "Barber Shop Name",
  "address": "123 Main Street",
  "phone": "555-123-4567",
  "email": "info@barbershop.com",
  "slot_duration": 30,
  "tax_rate": 7.5,
  "allow_discounts": true,
  "allow_tips": true,
  "default_commission": 20
}
```
- **Response**: `{ "success": true, "settings": BusinessSettings }`

#### Get GST Rates
- **URL**: `/settings/gst-rates`
- **Method**: `GET`
- **Auth Required**: Yes
- **Response**: `{ "success": true, "gstRates": GSTRate[] }`

#### Update GST Rates
- **URL**: `/settings/gst-rates`
- **Method**: `PUT`
- **Auth Required**: Yes (Admin only)
- **Body**:
```javascript
{
  "gstRates": [
    {
      "id": "rate-id-1", // Optional for existing rates
      "name": "Standard GST",
      "is_active": true,
      "components": [
        {
          "name": "CGST",
          "rate": 9.0
        },
        {
          "name": "SGST",
          "rate": 9.0
        }
      ]
    }
  ]
}
```
- **Response**: `{ "success": true, "gstRates": GSTRate[] }`

### Reports

#### Get Dashboard Statistics
- **URL**: `/reports/dashboard`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Parameters**: `period` (daily, weekly, monthly)
- **Response**: `{ "success": true, "data": DashboardStats }`

#### Get Revenue Report
- **URL**: `/reports/revenue`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Parameters**: `dateFrom`, `dateTo`, `groupBy` (day, week, month)
- **Response**: `{ "success": true, "data": RevenueData }`

#### Get Services Report
- **URL**: `/reports/services`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Parameters**: `dateFrom`, `dateTo`, `sort`
- **Response**: `{ "success": true, "data": ServicesData }`

#### Get Staff Report
- **URL**: `/reports/staff`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Parameters**: `dateFrom`, `dateTo`, `sort`
- **Response**: `{ "success": true, "data": StaffData }`

### Public API

#### Get Business Info
- **URL**: `/public/business`
- **Method**: `GET`
- **Auth Required**: No
- **Response**: `{ "success": true, "business": BusinessInfo }`

#### Get Gallery Images
- **URL**: `/public/gallery`
- **Method**: `GET`
- **Auth Required**: No
- **Response**: `{ "success": true, "images": [{ "id": string, "url": string, "title": string, "description": string, "category": string }] }`

#### Get Services
- **URL**: `/public/services`
- **Method**: `GET`
- **Auth Required**: No
- **Query Parameters**: `category`
- **Response**: `{ "success": true, "services": ServicesByCategory }`

#### Get Staff
- **URL**: `/public/staff`
- **Method**: `GET`
- **Auth Required**: No
- **Response**: `{ "success": true, "staff": PublicStaffInfo[] }`

#### Get Reviews
- **URL**: `/public/reviews`
- **Method**: `GET`
- **Auth Required**: No
- **Response**: `{ "success": true, "reviews": Review[] }`

#### Submit Contact Form
- **URL**: `/public/contact`
- **Method**: `POST`
- **Auth Required**: No
- **Body**:
```javascript
{
  "name": "Visitor Name",
  "email": "visitor@example.com",
  "phone": "555-123-4567", // Optional
  "message": "Contact message"
}
```
- **Response**: `{ "success": true, "message": "Contact form submitted successfully" }`

#### Create Booking
- **URL**: `/public/booking`
- **Method**: `POST`
- **Auth Required**: No
- **Body**:
```javascript
{
  "customer_name": "Customer Name",
  "customer_email": "customer@example.com",
  "customer_phone": "555-123-4567",
  "service_id": "service-id",
  "staff_id": "staff-id",
  "date": "2025-06-10",
  "time": "14:00",
  "notes": "Booking notes" // Optional
}
```
- **Response**: `{ "success": true, "appointment": Appointment }`

## Error Handling

Always check the `success` field in responses to determine if the request was successful:

```javascript
try {
  const data = await fetchData('/customers');
  
  if (data.success) {
    // Handle successful response
    displayCustomers(data.customers);
  } else {
    // Handle unsuccessful response with a valid status code
    showError(data.message);
  }
} catch (error) {
  // Handle network errors or unexpected issues
  showError('Network error or unexpected issue: ' + error.message);
}
```

## Pagination

Several endpoints support pagination with the following query parameters:
- `page`: Page number (starts at 1)
- `limit`: Number of items per page

```javascript
// Example: Get page 2 of customers with 10 items per page
const data = await fetchData('/customers?page=2&limit=10');
```

The response will include:
- `totalCount`: Total number of records
- `pages`: Total number of pages

## Filtering and Sorting

Many endpoints support filtering and sorting:

```javascript
// Example: Get appointments for a specific date and staff member
const data = await fetchData('/appointments?date=2025-06-10&staffId=staff-id-here');

// Example: Sort customers by name in ascending order
const data = await fetchData('/customers?sort=name_asc');
```

## Best Practices

1. **Token Management**:
   - Store tokens securely (localStorage for demos, secure HTTP-only cookies for production)
   - Implement token refresh mechanism
   - Handle token expiration gracefully

2. **Error Handling**:
   - Always provide user-friendly error messages
   - Log detailed errors for debugging
   - Implement retry logic for network failures

3. **Loading States**:
   - Show loading indicators during API requests
   - Disable form submissions while requests are in progress

4. **Data Validation**:
   - Validate user input before sending to API
   - Handle validation errors appropriately

5. **Responsive Design**:
   - Ensure UI adapts to API response timing
   - Implement optimistic UI updates when appropriate

## Example Integration

```javascript
// Authentication service
const AuthService = {
  login: async (email, password) => {
    // Implementation as shown above
  },
  
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  
  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
  
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  }
};

// API service
const ApiService = {
  fetchData: async (endpoint, method = 'GET', body = null) => {
    // Implementation as shown above
  }
};

// Example usage in a React component
function AppointmentList() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    async function loadAppointments() {
      try {
        setLoading(true);
        const data = await ApiService.fetchData('/appointments');
        
        if (data.success) {
          setAppointments(data.appointments);
          setError(null);
        } else {
          setError(data.message);
        }
      } catch (error) {
        setError('Failed to load appointments: ' + error.message);
      } finally {
        setLoading(false);
      }
    }
    
    loadAppointments();
  }, []);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      <h2>Appointments</h2>
      <ul>
        {appointments.map(appointment => (
          <li key={appointment.id}>
            {appointment.date} at {appointment.time} - {appointment.customer_name}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Conclusion

This guide covers the basics of integrating with the Barber Shop Management API. For detailed information about specific endpoints and data structures, refer to the API documentation or contact the API development team. 