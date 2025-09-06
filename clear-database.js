#!/usr/bin/env node

/**
 * Script to clear database tables for reseeding
 * Date: 13/06/2025
 */

const path = require('path');
const { Sequelize } = require('sequelize');

// Load environment variables
require('dotenv').config();

// Get environment
const env = process.env.NODE_ENV || 'development';
let config;

// For Vercel deployment, use special optimized config when in production
if (env === 'production' && process.env.VERCEL) {
  
  config = require('./src/config/vercel-db.js');
} else {
  
  config = require('./src/config/database.js')[env];
}

// Create Sequelize instance
const sequelize = new Sequelize(
  config.database, 
  config.username, 
  config.password, 
  {
    host: config.host,
    dialect: config.dialect,
    logging: console.log,
    port: config.port || 3307
  }
);

// Tables in order of deletion (reverse dependency order)
const tables = [
  'activity_logs',
  'tax_components',
  'invoice_services',
  'invoices',
  'appointment_services',
  'appointments',
  'reviews',
  'staff_services',
  'working_hours',
  'staff',
  'services',
  'products',
  'business_settings',
  'business_hours',
  'shop_closures',
  'gallery_images',
  'gst_components',
  'gst_rates',
  'customers',
  'users'
];

// Run the clear operation
(async () => {
  try {
    
    await sequelize.authenticate();
    
    
    
    
    tables.forEach(table => 
    
    
    
    // Check if --confirm flag is provided
    if (process.argv.includes('--confirm')) {
      
      
      // Disable foreign key checks temporarily
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
      
      // Clear each table in order
      for (const table of tables) {
        
        await sequelize.query(`DELETE FROM ${table}`);
      }
      
      // Re-enable foreign key checks
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
      
      
      
      
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error clearing database:', error);
    process.exit(1);
  } finally {
    // Close the database connection
    await sequelize.close();
  }
})(); 