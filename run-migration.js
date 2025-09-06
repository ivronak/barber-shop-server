require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');



try {
  // Run the migration using sequelize-cli
  execSync('npx sequelize-cli db:migrate', {
    stdio: 'inherit',
    cwd: path.join(__dirname)
  });
  
  
} catch (error) {
  console.error('Migration failed:', error.message);
  
  
  
  
  
  // Display the SQL script content
  try {
    const sqlScript = fs.readFileSync(path.join(__dirname, 'fix-reviews-table.sql'), 'utf8');
    
    
  } catch (readError) {
    console.error('Could not read SQL script:', readError.message);
  }
  
  process.exit(1);
} 