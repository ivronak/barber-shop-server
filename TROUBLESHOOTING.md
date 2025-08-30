# Troubleshooting Guide

## Guest Customer and Seeders Issues

If you're experiencing issues with database seeders, particularly related to the guest customer, follow these steps:

### Error: "Validation error" when running seeders

This usually happens when you try to insert a record that already exists or violates a validation rule.

### Solution 1: Use Direct SQL Insertion

We've created a direct SQL insertion script that bypasses Sequelize validation:

```bash
npm run add-guest
```

This will add the guest customer record directly to the database using SQL.

### Solution 2: Check Existing Records

You can check if the guest customer already exists by connecting to your database and running:

```sql
SELECT * FROM customers WHERE id = 'guest-user';
```

### Solution 3: Manual Insertion

If all else fails, you can manually insert the guest customer using SQL:

```sql
INSERT INTO customers 
(id, name, email, phone, visit_count, total_spent, last_visit, notes, created_at, updated_at) 
VALUES 
('guest-user', 'Guest Customer', NULL, '0000000000', 0, 0.00, NULL, 'Default guest customer for walk-in transactions', NOW(), NOW());
```

## Checking Database Structure

To see the structure of your tables:

```sql
DESCRIBE customers;
DESCRIBE users;
```

## API to Frontend Integration

Remember that your frontend should use 'guest-user' as the customer_id for guest transactions. The API expects this exact ID to match the record in the database.

## Deployment on Vercel

When deploying to Vercel, the build process will automatically attempt to add the guest customer. Check the build logs for any errors. 