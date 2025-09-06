require('dotenv').config();
const { User, Staff, sequelize } = require('./src/models');

async function checkStaffRecords() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Connected to database successfully');
    
    // Find all users with staff role
    const staffUsers = await User.findAll({
      where: {
        role: 'staff'
      }
    });
    
    console.log(`Found ${staffUsers.length} users with staff role`);
    
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
        console.log(`User ID: ${user.id}, Name: ${user.name}, Email: ${user.email} - Missing staff record`);
        
        // Create missing staff record
        console.log(`Creating staff record for user ID: ${user.id}`);
        await Staff.create({
          user_id: user.id,
          position: 'Barber',
          commission_percentage: 0.00,
          is_available: true
        });
        console.log(`Staff record created for user ID: ${user.id}`);
      }
    }
    
    console.log(`Total users with staff role: ${staffUsers.length}`);
    console.log(`Users with missing staff records: ${missingStaffRecords}`);
    console.log(`All missing staff records have been created`);
    
  } catch (error) {
    console.error('Error checking staff records:', error);
  } finally {
    await sequelize.close();
  }
}

checkStaffRecords(); 