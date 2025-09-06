'use strict';
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if admin user already exists
    const existingAdmin = await queryInterface.sequelize.query(
      `SELECT id FROM users WHERE email = 'admin@barbershop.com'`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    
    // Only insert if admin doesn't exist
    if (existingAdmin.length === 0) {
      const adminId = uuidv4();
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await queryInterface.bulkInsert('users', [{
        id: adminId,
        name: 'Admin User',
        email: 'admin@barbershop.com',
        password: hashedPassword,
        phone: '1234567890',
        role: 'admin',
        created_at: new Date(),
        updated_at: new Date()
      }], {});
      
      console.log('Admin user seeded successfully');
    } else {
      console.log('Admin user already exists, skipping');
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', { email: 'admin@barbershop.com' }, {});
  }
}; 