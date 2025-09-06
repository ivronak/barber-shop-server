require('dotenv').config();
const { User, Staff, sequelize } = require('./src/models');
const bcrypt = require('bcryptjs');

async function checkSpecificUser() {
  try {
    
    await sequelize.authenticate();
    
    
    // Email to check - from the curl request
    const email = "Joj@barber.com";
    
    // Find the user
    const user = await User.findOne({ 
      where: { email },
      raw: true // Get plain object instead of Sequelize instance
    });
    
    if (!user) {
      
      
      // Create the user if it doesn't exist
      
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(email, salt); // Using email as password
      
      const newUser = await User.create({
        name: 'Joj Staff',
        email: email,
        password: hashedPassword,
        phone: '555-123-4567',
        role: 'staff'
      });
      
      
      
      // Create staff record
      const staffRecord = await Staff.create({
        user_id: newUser.id,
        position: 'Barber',
        commission_percentage: 20.00,
        is_available: true
      });
      
      
      
      return;
    }
    
    
    
    
    // Check if there's a staff record for this user
    if (user.role === 'staff') {
      const staffRecord = await Staff.findOne({
        where: { user_id: user.id },
        raw: true
      });
      
      if (staffRecord) {
        
        
      } else {
        
        
        // Create staff record
        const newStaffRecord = await Staff.create({
          user_id: user.id,
          position: 'Barber',
          commission_percentage: 20.00,
          is_available: true
        });
        
        
      }
    }
    
    // Reset the password
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(email, salt); // Using email as password
    
    await User.update(
      { password: hashedPassword },
      { where: { id: user.id } }
    );
    
    
    
    
  } catch (error) {
    console.error('Error checking user:', error);
  } finally {
    await sequelize.close();
  }
}

checkSpecificUser(); 