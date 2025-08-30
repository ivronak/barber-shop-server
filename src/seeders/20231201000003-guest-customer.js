'use strict';
const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create a fixed ID for the guest customer
    const guestCustomerId = 'guest-user';
    
    // Check if guest customer already exists
    const existingGuest = await queryInterface.sequelize.query(
      `SELECT id FROM customers WHERE id = '${guestCustomerId}'`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    
    // Only insert if it doesn't exist
    if (existingGuest.length === 0) {
      await queryInterface.bulkInsert('customers', [{
        id: guestCustomerId,
        name: 'Guest Customer',
        email: null,
        phone: '0000000000', // A placeholder phone number
        visit_count: 0,
        total_spent: 0.00,
        last_visit: null,
        notes: 'Default guest customer for walk-in transactions',
        created_at: new Date(),
        updated_at: new Date()
      }], {});
      
      console.log('Guest customer seeded successfully');
    } else {
      console.log('Guest customer already exists, skipping');
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('customers', { id: 'guest-user' }, {});
  }
}; 