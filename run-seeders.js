'use strict';

const path = require('path');
const { Sequelize } = require('sequelize');
const { Umzug, SequelizeStorage } = require('umzug');

// This script runs seeders in production or development environments
async function runSeeders() {
  

  // Load environment variables
  require('dotenv').config();

  // Create database connection
  const sequelize = new Sequelize(
    process.env.DB_NAME || 'barber_shop_db',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3307,
      dialect: 'mysql',
      logging: console.log,
    }
  );

  // Test the connection
  try {
    await sequelize.authenticate();
    
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
  
  // First, ensure guest customer exists using direct SQL
  try {
    
    const queryInterface = sequelize.getQueryInterface();
    
    // Check if guest customer already exists
    const [existingGuests] = await sequelize.query(
      "SELECT id FROM customers WHERE id = 'guest-user'"
    );
    
    if (existingGuests.length === 0) {
      // Insert guest customer directly
      await sequelize.query(
        `INSERT INTO customers 
         (id, name, email, phone, visit_count, total_spent, last_visit, notes, created_at, updated_at) 
         VALUES 
         ('guest-user', 'Guest Customer', NULL, '0000000000', 0, 0.00, NULL, 'Default guest customer for walk-in transactions', NOW(), NOW())`
      );
      
    } else {
      
    }
  } catch (error) {
    console.error('Error ensuring guest customer exists:', error);
    // Don't exit, try to continue with other seeders
  }

  // Set up the Umzug instance for seeders
  const umzug = new Umzug({
    migrations: {
      glob: path.join(__dirname, 'src', 'seeders', '*.js'),
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize }),
    logger: console,
  });

  // Run seeders
  try {
    const executed = await umzug.up();
    
    executed.forEach(seeder => {
      
    });
  } catch (error) {
    console.error('Error running seeders:', error);
    // Don't exit immediately, try to continue with database close
  }

  // Close connection
  await sequelize.close();
  
}

// Run the function
runSeeders().catch(err => {
  console.error('Uncaught error:', err);
  process.exit(1);
}); 