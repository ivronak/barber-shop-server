const mysql = require('mysql2/promise');
require('dotenv').config();

async function queryCustomers() {
  
  
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
    
    
    
    // Check specifically for guest user
    const [guestRows] = await connection.execute(
      "SELECT id, name, email, phone FROM customers WHERE id = 'guest-user' OR name LIKE '%Guest%'"
    );
    
    
    
  } catch (error) {
    console.error('Error querying customers:', error);
  } finally {
    await connection.end();
    
  }
}

// Run the function
queryCustomers().catch(err => {
  console.error('Uncaught error:', err);
  process.exit(1);
}); 