require('dotenv').config();
const { Staff, User, Invoice } = require('./src/models');
const { sequelize } = require('./src/models');

async function debugStaffCommission() {
  try {
    console.log('===== DEBUGGING STAFF COMMISSION CALCULATION =====');
    
    // 1. Get all staff members with their commission rates
    const staffMembers = await Staff.findAll({
      include: [{
        model: User,
        as: 'user'
      }]
    });
    
    console.log(`\nFound ${staffMembers.length} staff members in the database:`);
    staffMembers.forEach(staff => {
      console.log(`Staff ID: ${staff.id}`);
      console.log(`Name: ${staff.user ? staff.user.name : 'Unknown'}`);
      console.log(`Commission Percentage: ${staff.commission_percentage}%`);
      console.log('---');
    });
    
    // 2. Get a sample of invoices for each staff to check revenue calculation
    for (const staff of staffMembers) {
      const recentInvoices = await Invoice.findAll({
        where: { staff_id: staff.id, status: 'paid' },
        limit: 5,
        order: [['date', 'DESC']]
      });
      
      console.log(`\nRecent invoices for staff ${staff.id} (${staff.user ? staff.user.name : 'Unknown'}):`);
      
      if (recentInvoices.length === 0) {
        console.log('No invoices found for this staff member');
        continue;
      }
      
      let totalRevenue = 0;
      
      recentInvoices.forEach(invoice => {
        console.log(`Invoice ID: ${invoice.id}`);
        console.log(`Date: ${invoice.date}`);
        console.log(`Total: $${invoice.total}`);
        console.log(`Staff ID in invoice: ${invoice.staff_id}`);
        console.log(`Staff Name in invoice: ${invoice.staff_name}`);
        console.log('---');
        
        totalRevenue += parseFloat(invoice.total);
      });
      
      // 3. Calculate commission manually to verify
      const commissionPercentage = parseFloat(staff.commission_percentage);
      const expectedCommission = (totalRevenue * commissionPercentage) / 100;
      
      console.log(`Total Revenue from sample invoices: $${totalRevenue.toFixed(2)}`);
      console.log(`Commission Percentage: ${commissionPercentage}%`);
      console.log(`Expected Commission: $${expectedCommission.toFixed(2)}`);
      
      // 4. Check if commission is being calculated correctly
      if (expectedCommission === 0 && commissionPercentage > 0) {
        console.log('WARNING: Commission is 0 despite having a non-zero commission percentage!');
      }
    }
    
    // 5. Test the calculation logic directly from getStaffReport
    const today = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(today.getMonth() - 1);
    
    const dateFrom = oneMonthAgo.toISOString().split('T')[0];
    const dateTo = today.toISOString().split('T')[0];
    
    console.log(`\n===== TESTING REPORT CALCULATION LOGIC =====`);
    console.log(`Date range: ${dateFrom} to ${dateTo}`);
    
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
    
    console.log(`\nStaff performance data (before commission calculation):`);
    staffData.forEach(staffMember => {
      console.log(`Staff ID: ${staffMember.staff_id}`);
      console.log(`Name: ${staffMember.staff_name}`);
      console.log(`Revenue: $${parseFloat(staffMember.revenue).toFixed(2)}`);
      console.log(`Appointments: ${staffMember.appointments}`);
      console.log('---');
    });
    
    // Calculate commission for each staff member
    const staffWithCommission = await Promise.all(
      staffData.map(async (staffMember) => {
        const staff = await Staff.findByPk(staffMember.staff_id);
        console.log(`\nLooking up staff ID: ${staffMember.staff_id}`);
        console.log(`Found staff in database: ${staff ? 'Yes' : 'No'}`);
        
        if (staff) {
          console.log(`Staff commission percentage from DB: ${staff.commission_percentage}%`);
        } else {
          console.log('WARNING: Staff not found in database! This will lead to 0% commission.');
        }
        
        const commissionPercentage = staff ? parseFloat(staff.commission_percentage) : 0;
        const revenue = parseFloat(staffMember.revenue || 0);
        const commission = (revenue * commissionPercentage) / 100;
        
        console.log(`Revenue: $${revenue.toFixed(2)}`);
        console.log(`Commission calculation: $${revenue.toFixed(2)} * ${commissionPercentage}% / 100 = $${commission.toFixed(2)}`);
        
        return {
          ...staffMember.toJSON(),
          commissionPercentage,
          commission
        };
      })
    );
    
    console.log(`\n===== FINAL STAFF DATA WITH COMMISSION =====`);
    staffWithCommission.forEach(staff => {
      console.log(`Staff ID: ${staff.staff_id}`);
      console.log(`Name: ${staff.staff_name}`);
      console.log(`Revenue: $${parseFloat(staff.revenue).toFixed(2)}`);
      console.log(`Commission Percentage: ${staff.commissionPercentage}%`);
      console.log(`Commission Amount: $${staff.commission.toFixed(2)}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

// Execute the debug function
debugStaffCommission(); 