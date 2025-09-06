// This file is needed to ensure dependencies are correctly installed for Vercel deployment
const mysql2 = require('mysql2');
const bcryptjs = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Get mysql2 version
console.log('mysql2 version:', require('mysql2/package.json').version);

// Get bcryptjs version safely
try {
  // Try to get the version directly from node_modules
  const bcryptjsPackagePath = path.join(process.cwd(), 'node_modules', 'bcryptjs', 'package.json');
  const bcryptjsPackage = fs.existsSync(bcryptjsPackagePath) 
    ? JSON.parse(fs.readFileSync(bcryptjsPackagePath, 'utf8')) 
    : { version: 'unknown' };
  
  console.log('bcryptjs version:', bcryptjsPackage.version);
} catch (error) {
  console.log('bcryptjs is installed but version could not be determined');
}

console.log('mysql2 and bcryptjs successfully loaded');

// Test bcryptjs functionality
const hash = bcryptjs.hashSync('test', 10);
console.log('bcryptjs hash test passed:', bcryptjs.compareSync('test', hash)); 

// Attempt to run seeders if environment variables are available
if (process.env.VERCEL_ENV === 'production' && process.env.DB_HOST) {
  console.log('Attempting to run seeders in production environment...');
  try {
    // First try running migrations
    const { spawn } = require('child_process');
    
    console.log('Running migrations...');
    const migrate = spawn('npx', ['sequelize-cli', 'db:migrate']);
    
    migrate.stdout.on('data', (data) => {
      console.log(`Migration output: ${data}`);
    });
    
    migrate.stderr.on('data', (data) => {
      console.error(`Migration error: ${data}`);
    });
    
    migrate.on('close', (code) => {
      console.log(`Migration process exited with code ${code}`);
      
      // After migrations, run the guest customer script directly
      console.log('Adding guest customer...');
      const guestScript = spawn('node', ['add-guest-customer.js']);
      
      guestScript.stdout.on('data', (data) => {
        console.log(`Guest script output: ${data}`);
      });
      
      guestScript.stderr.on('data', (data) => {
        console.error(`Guest script error: ${data}`);
      });
      
      guestScript.on('close', (code) => {
        console.log(`Guest script process exited with code ${code}`);
      });
    });
  } catch (error) {
    console.error('Failed to run migrations or add guest customer:', error);
  }
} 