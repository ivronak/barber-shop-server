require('dotenv').config();
const { User, sequelize } = require('./src/models');
const bcrypt = require('bcryptjs');

async function resetStaffPassword() {
  try {
    
    await sequelize.authenticate();
    
    
    // Get email from command line arguments
    const email = process.argv[2];
    const newPassword = process.argv[3] || 'password123'; // Default password if not provided
    
    if (!email) {
      console.error('Please provide an email address as the first argument');
      
      process.exit(1);
    }
    
    // Find the user
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      console.error(`No user found with email: ${email}`);
      process.exit(1);
    }
    
    
    
    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update the password
    await user.update({ password: hashedPassword });
    
    
    
    
  } catch (error) {
    console.error('Error resetting password:', error);
  } finally {
    await sequelize.close();
  }
}

resetStaffPassword(); 