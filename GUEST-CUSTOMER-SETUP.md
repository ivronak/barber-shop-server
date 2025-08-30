# Guest Customer Implementation

This document explains the implementation of the default Guest Customer feature in the Barber Shop Management System.

## Overview

The system includes a default "Guest Customer" that can be used for walk-in customers or situations where customer information is not available or needed. This allows the POS system to create invoices without requiring full customer information.

## Implementation Details

### 1. Database Seeder

A database seeder (`20231201000003-guest-customer.js`) has been created to insert a dedicated Guest Customer record with the following details:

```javascript
{
  id: 'guest-user',
  name: 'Guest Customer',
  email: null,
  phone: '0000000000',
  visit_count: 0,
  total_spent: 0.00,
  notes: 'Default guest customer for walk-in transactions'
}
```

The seeder includes checks to prevent duplicate records if run multiple times.

### 2. Running the Seeder

The seeder can be run in multiple ways:

#### Development Environment

```bash
npm run seed
```

This runs all seeders using Sequelize CLI.

#### Production Environment (Manual)

```bash
npm run seed:prod
```

This runs the custom seeder script that works in the production environment.

#### Production Environment (Automatic)

The `vercel-build.js` script attempts to run the seeders during the build process on Vercel if the required environment variables are available.

### 3. Frontend Integration

The frontend uses the 'guest-user' ID when creating invoices for guest customers. This is implemented in the `StepInvoiceDialog.tsx` file:

```typescript
const guestCustomerId = 'guest-user';

const invoiceData = {
  customer_id: formData.isGuestUser ? guestCustomerId : formData.customerDetails?.phone || customerData[0].id,
  customer_name: formData.isGuestUser ? 'Guest' : (formData.customerDetails?.name || formData.customerName || 'Guest'),
  // ... other properties
};
```

## Usage

When creating a new invoice, the user can:

1. Select an existing customer
2. Create a new customer
3. Proceed without customer information (which will use the Guest Customer)

For guest transactions, the system will:
- Use the fixed ID 'guest-user' as the customer_id
- Display 'Guest' as the customer name in the UI
- Maintain all other invoice features (services, payments, etc.)

## Maintenance

If the 'guest-user' record is accidentally deleted from the database, it will be recreated when:

1. The seeder is run manually
2. The application is redeployed on Vercel (as the build script will run the seeder)

## Troubleshooting

If you encounter foreign key constraint errors when creating invoices for guest customers, ensure:

1. The 'guest-user' record exists in the customers table
2. Run the seeder manually using `npm run seed:prod`
3. Check the database logs for any constraint violations

## Database Impact

The Guest Customer record:
- Takes minimal space in the database
- Is excluded from customer analytics (via the 'notes' field that identifies it as a guest)
- Allows normal database operations without modifying the schema 