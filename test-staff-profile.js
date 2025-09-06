require('dotenv').config();
const { Staff, User } = require('./src/models');
const { sequelize } = require('./src/models');

async function checkStaffProfile() {
  try {
    // The user ID from the token
    const userId = 'bb1c8744-f033-4d1e-a908-f8ef8818a167';
    
    
    
    // Find the user
    const user = await User.findByPk(userId);
    if (!user) {
      
      return;
    }
    
    console.log('User found:', {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    });
    
    // Find the staff profile
    const staffProfile = await Staff.findOne({
      where: { user_id: userId }
    });
    
    if (!staffProfile) {
      
      
      // Create a staff profile
      
      const newStaffProfile = await Staff.create({
        user_id: userId,
        position: 'Barber',
        commission_percentage: 20.00,
        is_available: true
      });
      
      console.log('Staff profile created:', {
        id: newStaffProfile.id,
        user_id: newStaffProfile.user_id,
        position: newStaffProfile.position
      });
    } else {
      console.log('Staff profile found:', {
        id: staffProfile.id,
        user_id: staffProfile.user_id,
        position: staffProfile.position
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

checkStaffProfile(); 