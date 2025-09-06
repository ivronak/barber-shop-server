require('dotenv').config();
const { Sequelize } = require('sequelize');
const env = process.env.NODE_ENV || 'development';

// Get the database configuration
let config;
if (env === 'production' && process.env.VERCEL) {
  
  config = require('./src/config/vercel-db.js');
} else {
  
  config = require('./src/config/database.js')[env];
}

// Create a new Sequelize instance
const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    dialect: config.dialect,
    logging: false
  }
);

async function fixForeignKeys() {
  try {
    
    await sequelize.authenticate();
    

    // Get the constraint name for customer_id
    const [customerConstraints] = await sequelize.query(`
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_NAME = 'reviews' 
      AND COLUMN_NAME = 'customer_id' 
      AND REFERENCED_TABLE_NAME = 'customers'
    `);

    // Get the constraint name for staff_id
    const [staffConstraints] = await sequelize.query(`
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_NAME = 'reviews' 
      AND COLUMN_NAME = 'staff_id' 
      AND REFERENCED_TABLE_NAME = 'staff'
    `);

    console.log('Found constraints:', {
      customerConstraints: customerConstraints.map(c => c.CONSTRAINT_NAME),
      staffConstraints: staffConstraints.map(c => c.CONSTRAINT_NAME)
    });

    // Drop existing constraints
    for (const constraint of customerConstraints) {
      
      await sequelize.query(`
        ALTER TABLE reviews 
        DROP FOREIGN KEY ${constraint.CONSTRAINT_NAME}
      `);
    }

    for (const constraint of staffConstraints) {
      
      await sequelize.query(`
        ALTER TABLE reviews 
        DROP FOREIGN KEY ${constraint.CONSTRAINT_NAME}
      `);
    }

    // Add customer_name and staff_name columns if they don't exist
    try {
      
      await sequelize.query(`
        ALTER TABLE reviews 
        ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255) NULL 
        AFTER customer_id
      `);
    } catch (error) {
      
    }

    try {
      
      await sequelize.query(`
        ALTER TABLE reviews 
        ADD COLUMN IF NOT EXISTS staff_name VARCHAR(255) NULL 
        AFTER staff_id
      `);
    } catch (error) {
      
    }

    // Make customer_id and staff_id nullable
    
    await sequelize.query(`
      ALTER TABLE reviews 
      MODIFY COLUMN customer_id VARCHAR(36) NULL
    `);

    
    await sequelize.query(`
      ALTER TABLE reviews 
      MODIFY COLUMN staff_id VARCHAR(36) NULL
    `);

    // Re-add foreign key constraints with ON DELETE SET NULL
    
    await sequelize.query(`
      ALTER TABLE reviews 
      ADD CONSTRAINT reviews_customer_id_fkey
      FOREIGN KEY (customer_id) 
      REFERENCES customers(id)
      ON DELETE SET NULL 
      ON UPDATE CASCADE
    `);

    
    await sequelize.query(`
      ALTER TABLE reviews 
      ADD CONSTRAINT reviews_staff_id_fkey
      FOREIGN KEY (staff_id) 
      REFERENCES staff(id)
      ON DELETE SET NULL 
      ON UPDATE CASCADE
    `);

    
  } catch (error) {
    console.error('Error fixing foreign keys:', error);
  } finally {
    await sequelize.close();
  }
}

fixForeignKeys(); 