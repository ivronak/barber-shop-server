require('dotenv').config();
const { User, Staff, sequelize } = require('./src/models');

async function checkStaffRecords() {
  try {
    
    await sequelize.authenticate();
    
    
    // Find all users with staff role
    const staffUsers = await User.findAll({
      where: {
        role: 'staff'
      }
    });
    
    
    
    // Check if each staff user has a corresponding staff record
    let missingStaffRecords = 0;
    
    for (const user of staffUsers) {
      const staffRecord = await Staff.findOne({
        where: {
          user_id: user.id
        }
      });
      
      if (!staffRecord) {
        missingStaffRecords++;
        
        
        // Create missing staff record
        
        await Staff.create({
          user_id: user.id,
          position: 'Barber',
          commission_percentage: 0.00,
          is_available: true
        });
        
      }
    }
    
    
    
    
    
  } catch (error) {
    console.error('Error checking staff records:', error);
  } finally {
    await sequelize.close();
  }
}

checkStaffRecords(); 