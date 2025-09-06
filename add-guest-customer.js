'use strict';

// This script adds the guest customer record directly using SQL
// It's a more direct approach than using seeders when you're having issues

const mysql = require('mysql2/promise');
require('dotenv').config();

async function addGuestCustomer() {
  console.log('Starting to add guest customer...');
  
  // Create a MySQL connection
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3307,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'barber_shop_db'
  });
  
  try {
    // Check if guest customer already exists
    const [existingRows] = await connection.execute(
      "SELECT id FROM customers WHERE id = 'guest-user'"
    );
    
    if (existingRows.length > 0) {
      console.log('Guest customer already exists, skipping insertion.');
      return;
    }
    
    // Insert the guest customer
    const [result] = await connection.execute(
      `INSERT INTO customers 
       (id, name, email, phone, visit_count, total_spent, last_visit, notes, created_at, updated_at) 
       VALUES 
       ('guest-user', 'Guest Customer', NULL, '0000000000', 0, 0.00, NULL, 'Default guest customer for walk-in transactions', NOW(), NOW())`
    );
    
    console.log('Guest customer added successfully.');
    console.log('Affected rows:', result.affectedRows);
    
  } catch (error) {
    console.error('Error adding guest customer:', error);
  } finally {
    await connection.end();
    console.log('Database connection closed.');
  }
}

// Run the function
addGuestCustomer().catch(err => {
  console.error('Uncaught error:', err);
  process.exit(1);
}); 