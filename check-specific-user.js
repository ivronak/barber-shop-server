require('dotenv').config();
const { User, Staff, sequelize } = require('./src/models');
const bcrypt = require('bcryptjs');

async function checkSpecificUser() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Connected to database successfully');
    
    // Email to check - from the curl request
    const email = "Joj@barber.com";
    
    // Find the user
    const user = await User.findOne({ 
      where: { email },
      raw: true // Get plain object instead of Sequelize instance
    });
    
    if (!user) {
      console.log(`No user found with email: ${email}`);
      
      // Create the user if it doesn't exist
      console.log(`Creating user with email: ${email}`);
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(email, salt); // Using email as password
      
      const newUser = await User.create({
        name: 'Joj Staff',
        email: email,
        password: hashedPassword,
        phone: '555-123-4567',
        role: 'staff'
      });
      
      console.log(`Created user with ID: ${newUser.id}`);
      
      // Create staff record
      const staffRecord = await Staff.create({
        user_id: newUser.id,
        position: 'Barber',
        commission_percentage: 20.00,
        is_available: true
      });
      
      console.log(`Created staff record with ID: ${staffRecord.id}`);
      
      return;
    }
    
    console.log('Found user:');
    console.log(JSON.stringify(user, null, 2));
    
    // Check if there's a staff record for this user
    if (user.role === 'staff') {
      const staffRecord = await Staff.findOne({
        where: { user_id: user.id },
        raw: true
      });
      
      if (staffRecord) {
        console.log('Staff record found:');
        console.log(JSON.stringify(staffRecord, null, 2));
      } else {
        console.log('No staff record found for this user');
        
        // Create staff record
        const newStaffRecord = await Staff.create({
          user_id: user.id,
          position: 'Barber',
          commission_percentage: 20.00,
          is_available: true
        });
        
        console.log(`Created staff record with ID: ${newStaffRecord.id}`);
      }
    }
    
    // Reset the password
    console.log('Resetting password...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(email, salt); // Using email as password
    
    await User.update(
      { password: hashedPassword },
      { where: { id: user.id } }
    );
    
    console.log('Password reset successfully');
    console.log(`New password is: ${email}`);
    
  } catch (error) {
    console.error('Error checking user:', error);
  } finally {
    await sequelize.close();
  }
}

checkSpecificUser(); 