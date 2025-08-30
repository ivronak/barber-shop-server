# Barber Shop Management System API

This repository contains the backend API server for the Barber Shop Management System, a comprehensive solution for managing a barber shop's appointments, staff, services, customers, and financial transactions.

## Features

- User authentication and role-based access control
- Staff management with working hours and services
- Service catalog management
- Appointment scheduling with conflict detection
- Customer database with visit history
- Invoicing and payment processing
- Business settings and tax configuration
- Reporting and analytics
- Public website API endpoints

## Technology Stack

- **Node.js** with Express.js for the API server
- **MySQL** database for data storage
- **Sequelize ORM** for database operations
- **JWT** for authentication
- **bcrypt** for password hashing

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MySQL (v5.7 or higher)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/barber-shop-api.git
   cd barber-shop-api
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory based on the `env.example` template:
   ```bash
   cp env.example .env
   ```
   Update the environment variables in the `.env` file with your configuration.

4. Create the database:
   ```bash
   npm run db:create
   ```

5. Run migrations to set up the database schema:
   ```bash
   npm run migrate
   ```

6. (Optional) Seed the database with initial data:
   ```bash
   npm run seed
   ```

### Development

Start the development server with hot reloading:
```bash
npm run dev
```

The API will be available at http://localhost:5000.

### Production

For production deployment:
```bash
npm start
```

## API Documentation

Please refer to the [API Documentation](api-documentation.md) for details on all available endpoints and their usage.

## Development Progress

The API server implementation has been partially completed with the following components:

- ✅ Authentication with JWT
- ✅ User and staff management
- ✅ Services management
- ✅ Customer management
- ✅ Basic appointment scheduling
- ✅ Business settings management
- ✅ Invoicing and payment processing
- ✅ Reporting and analytics
- ✅ Reviews and ratings
- ✅ Activity logging
- ✅ Public website API

Remaining tasks:
- Additional API endpoint validation
- Implement email notifications for appointments
- Implement SMS reminders
- Add unit and integration tests
- Set up CI/CD pipeline

## Testing API Endpoints

You can use tools like Postman or curl to test the API endpoints. Here are some example requests:

```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password123"}'

# Get current user
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

For a complete reference of all API endpoints with detailed curl examples, please check the [API Endpoints Reference](API-ENDPOINTS.md) file.

## Database Schema

The database schema includes the following main entities:
- Users (admin, staff, billing roles)
- Staff with working hours and services
- Services
- Customers
- Appointments
- Invoices
- Business Settings
- Reviews
- Activity Logs

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Acknowledgements

- Express.js team
- Sequelize ORM team
- MySQL team 