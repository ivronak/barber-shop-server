require('dotenv').config();
const { User, sequelize } = require('./src/models');
const bcrypt = require('bcryptjs');

async function resetStaffPassword() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Connected to database successfully');
    
    // Get email from command line arguments
    const email = process.argv[2];
    const newPassword = process.argv[3] || 'password123'; // Default password if not provided
    
    if (!email) {
      console.error('Please provide an email address as the first argument');
      console.log('Usage: node reset-staff-password.js <email> [new_password]');
      process.exit(1);
    }
    
    // Find the user
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      console.error(`No user found with email: ${email}`);
      process.exit(1);
    }
    
    console.log(`Found user: ${user.name}, Role: ${user.role}, ID: ${user.id}`);
    
    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update the password
    await user.update({ password: hashedPassword });
    
    console.log(`Password reset successfully for ${email}`);
    console.log(`New password: ${newPassword}`);
    
  } catch (error) {
    console.error('Error resetting password:', error);
  } finally {
    await sequelize.close();
  }
}

resetStaffPassword(); 