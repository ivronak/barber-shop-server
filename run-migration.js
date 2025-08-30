require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Running database migrations...');

try {
  // Run the migration using sequelize-cli
  execSync('npx sequelize-cli db:migrate', {
    stdio: 'inherit',
    cwd: path.join(__dirname)
  });
  
  console.log('Migration completed successfully!');
} catch (error) {
  console.error('Migration failed:', error.message);
  console.log('\nIf you are updating an existing database and encounter foreign key constraint errors:');
  console.log('1. Run the fix-foreign-keys.js script:');
  console.log('   node fix-foreign-keys.js');
  console.log('\n2. Or manually execute the SQL commands in fix-reviews-table.sql');
  
  // Display the SQL script content
  try {
    const sqlScript = fs.readFileSync(path.join(__dirname, 'fix-reviews-table.sql'), 'utf8');
    console.log('\nSQL Script Content:');
    console.log(sqlScript);
  } catch (readError) {
    console.error('Could not read SQL script:', readError.message);
  }
  
  process.exit(1);
} 