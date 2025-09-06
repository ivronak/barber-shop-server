// This file is needed to ensure dependencies are correctly installed for Vercel deployment
const mysql2 = require('mysql2');
const bcryptjs = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Get mysql2 version


// Get bcryptjs version safely
try {
  // Try to get the version directly from node_modules
  const bcryptjsPackagePath = path.join(process.cwd(), 'node_modules', 'bcryptjs', 'package.json');
  const bcryptjsPackage = fs.existsSync(bcryptjsPackagePath) 
    ? JSON.parse(fs.readFileSync(bcryptjsPackagePath, 'utf8')) 
    : { version: 'unknown' };
  
  
} catch (error) {
  
}



// Test bcryptjs functionality
const hash = bcryptjs.hashSync('test', 10);
 

// Attempt to run seeders if environment variables are available
if (process.env.VERCEL_ENV === 'production' && process.env.DB_HOST) {
  
  try {
    // First try running migrations
    const { spawn } = require('child_process');
    
    
    const migrate = spawn('npx', ['sequelize-cli', 'db:migrate']);
    
    migrate.stdout.on('data', (data) => {
      
    });
    
    migrate.stderr.on('data', (data) => {
      console.error(`Migration error: ${data}`);
    });
    
    migrate.on('close', (code) => {
      
      
      // After migrations, run the guest customer script directly
      
      const guestScript = spawn('node', ['add-guest-customer.js']);
      
      guestScript.stdout.on('data', (data) => {
        
      });
      
      guestScript.stderr.on('data', (data) => {
        console.error(`Guest script error: ${data}`);
      });
      
      guestScript.on('close', (code) => {
        
      });
    });
  } catch (error) {
    console.error('Failed to run migrations or add guest customer:', error);
  }
} 