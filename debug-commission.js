require('dotenv').config();
const { Staff, User, Invoice } = require('./src/models');
const { sequelize } = require('./src/models');

async function debugStaffCommission() {
  try {
    
    
    // 1. Get all staff members with their commission rates
    const staffMembers = await Staff.findAll({
      include: [{
        model: User,
        as: 'user'
      }]
    });
    
    
    staffMembers.forEach(staff => {
      
      
      
      
    });
    
    // 2. Get a sample of invoices for each staff to check revenue calculation
    for (const staff of staffMembers) {
      const recentInvoices = await Invoice.findAll({
        where: { staff_id: staff.id, status: 'paid' },
        limit: 5,
        order: [['date', 'DESC']]
      });
      
      
      
      if (recentInvoices.length === 0) {
        
        continue;
      }
      
      let totalRevenue = 0;
      
      recentInvoices.forEach(invoice => {
        
        
        
        
        
        
        
        totalRevenue += parseFloat(invoice.total);
      });
      
      // 3. Calculate commission manually to verify
      const commissionPercentage = parseFloat(staff.commission_percentage);
      const expectedCommission = (totalRevenue * commissionPercentage) / 100;
      
      
      
      
      
      // 4. Check if commission is being calculated correctly
      if (expectedCommission === 0 && commissionPercentage > 0) {
        
      }
    }
    
    // 5. Test the calculation logic directly from getStaffReport
    const today = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(today.getMonth() - 1);
    
    const dateFrom = oneMonthAgo.toISOString().split('T')[0];
    const dateTo = today.toISOString().split('T')[0];
    
    
    
    
    const staffData = await Invoice.findAll({
      attributes: [
        'staff_id',
        'staff_name',
        [sequelize.fn('count', sequelize.col('id')), 'appointments'],
        [sequelize.fn('sum', sequelize.col('total')), 'revenue']
      ],
      where: {
        date: {
          [sequelize.Op.between]: [new Date(dateFrom), new Date(dateTo)]
        },
        status: 'paid'
      },
      group: ['staff_id'],
      order: [[sequelize.fn('sum', sequelize.col('total')), 'DESC']]
    });
    
    
    staffData.forEach(staffMember => {
      
      
      
      
      
    });
    
    // Calculate commission for each staff member
    const staffWithCommission = await Promise.all(
      staffData.map(async (staffMember) => {
        const staff = await Staff.findByPk(staffMember.staff_id);
        
        
        
        if (staff) {
          
        } else {
          
        }
        
        const commissionPercentage = staff ? parseFloat(staff.commission_percentage) : 0;
        const revenue = parseFloat(staffMember.revenue || 0);
        const commission = (revenue * commissionPercentage) / 100;
        
        
        
        
        return {
          ...staffMember.toJSON(),
          commissionPercentage,
          commission
        };
      })
    );
    
    
    staffWithCommission.forEach(staff => {
      
      
      
      
      
      
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

// Execute the debug function
debugStaffCommission(); 