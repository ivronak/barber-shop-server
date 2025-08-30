const mysql = require('mysql2/promise');
require('dotenv').config();

async function queryServices() {
  console.log('Querying services table...');
  
  // Create a MySQL connection
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'barber_shop_db'
  });
  
  try {
    // Query services
    const [rows] = await connection.execute(
      "SELECT id, name, price, duration, category FROM services LIMIT 10"
    );
    
    console.log('Services found:', JSON.stringify(rows, null, 2));
    
    // Count services by category
    const [categoryCount] = await connection.execute(
      "SELECT category, COUNT(*) as count FROM services GROUP BY category"
    );
    
    console.log('Services by category:', JSON.stringify(categoryCount, null, 2));
    
    // Get service count
    const [countResult] = await connection.execute(
      "SELECT COUNT(*) as total FROM services"
    );
    
    console.log('Total service count:', countResult[0].total);
    
  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    await connection.end();
  }
}

queryServices(); 