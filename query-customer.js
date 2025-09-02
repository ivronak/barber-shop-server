const mysql = require('mysql2/promise');
require('dotenv').config();

async function queryCustomers() {
  console.log('Querying customers table...');
  
  // Create a MySQL connection
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3307,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'barber_shop_db'
  });
  
  try {
    // Query customers
    const [rows] = await connection.execute(
      "SELECT id, name, email, phone FROM customers LIMIT 10"
    );
    
    console.log('Customers found:', JSON.stringify(rows, null, 2));
    
    // Check specifically for guest user
    const [guestRows] = await connection.execute(
      "SELECT id, name, email, phone FROM customers WHERE id = 'guest-user' OR name LIKE '%Guest%'"
    );
    
    console.log('\nGuest customers found:', JSON.stringify(guestRows, null, 2));
    
  } catch (error) {
    console.error('Error querying customers:', error);
  } finally {
    await connection.end();
    console.log('Database connection closed.');
  }
}

// Run the function
queryCustomers().catch(err => {
  console.error('Uncaught error:', err);
  process.exit(1);
}); 