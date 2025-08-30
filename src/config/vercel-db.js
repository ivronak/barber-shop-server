/**
 * Special database configuration for Vercel deployments
 * This handles the unique requirements of serverless environments
 */

require('dotenv').config();
const mysql2 = require('mysql2');

// Load the mysql2 module explicitly to ensure it's included in the bundle
console.log('MySQL2 module loaded for Vercel deployment');

const config = {
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  dialect: 'mysql',
  dialectModule: mysql2,
  logging: false,
  pool: {
    max: 2,      // Keep connection pool small for serverless
    min: 0,      // Allow all connections to close when not in use
    idle: 10000, // Close idle connections after 10 seconds
    acquire: 60000, // Wait up to 60 seconds to get a connection
    evict: 1000  // Run eviction checks frequently
  },
  dialectOptions: {
    connectTimeout: 60000, // Increase connection timeout for cold starts
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  // Print debugging info about the connection
  hooks: {
    afterConnect: (connection, config) => {
      console.log(`Connected to database: ${process.env.DB_NAME} on host: ${process.env.DB_HOST}`);
      console.log('Connection ID:', connection.threadId);
    }
  }
};

module.exports = config; 