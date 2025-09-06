require('dotenv').config();
const { Staff, User } = require('./src/models');
const { sequelize } = require('./src/models');

// Default commission percentage if not specified
const DEFAULT_COMMISSION = 20.00;

async function setStaffCommission() {
  try {
    // Get command line arguments
    const args = process.argv.slice(2);
    const staffId = args[0]; // Optional: specific staff ID
    const commissionPercentage = parseFloat(args[1] || DEFAULT_COMMISSION); // Optional: commission percentage
    
    
    
    if (isNaN(commissionPercentage) || commissionPercentage < 0 || commissionPercentage > 100) {
      console.error('Error: Commission percentage must be a number between 0 and 100');
      return;
    }
    
    // If staffId is provided, update only that staff member
    if (staffId) {
      const staff = await Staff.findByPk(staffId);
      
      if (!staff) {
        console.error(`Error: Staff with ID ${staffId} not found`);
        return;
      }
      
      
      
      // Get user info
      const user = await User.findByPk(staff.user_id);
      const staffName = user ? user.name : 'Unknown';
      
      // Update commission
      const oldCommission = parseFloat(staff.commission_percentage);
      await staff.update({ commission_percentage: commissionPercentage });
      
      
      
    } 
    // Otherwise, update all staff members
    else {
      
      
      // Get all staff members
      const staffMembers = await Staff.findAll({
        include: [{
          model: User,
          as: 'user',
          attributes: ['name']
        }]
      });
      
      if (staffMembers.length === 0) {
        
        return;
      }
      
      // Update each staff member
      for (const staff of staffMembers) {
        const oldCommission = parseFloat(staff.commission_percentage);
        const staffName = staff.user ? staff.user.name : 'Unknown';
        
        await staff.update({ commission_percentage: commissionPercentage });
        
        
        
      }
      
      
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

// Show usage instructions if no arguments provided
if (process.argv.length <= 2) {
  console.log(`
Usage:
  node set-staff-commission.js [staff_id] [commission_percentage]

Examples:
  node set-staff-commission.js                     # Set all staff to ${DEFAULT_COMMISSION}% commission
  node set-staff-commission.js 30                  # Set all staff to 30% commission
  node set-staff-commission.js abc-123-def 25      # Set staff with ID abc-123-def to 25% commission
  `);
}

// Execute the function
setStaffCommission(); 