'use strict';
const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const services = [
      {
        id: uuidv4(),
        name: 'Haircut',
        description: 'Professional haircut tailored to your style preference',
        price: 25.00,
        duration: 30,
        category: 'Hair',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'Beard Trim',
        description: 'Clean up your beard with a professional trim',
        price: 15.00,
        duration: 15,
        category: 'Facial',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'Haircut & Beard Trim Combo',
        description: 'Combination of haircut and beard trim at a discounted price',
        price: 35.00,
        duration: 45,
        category: 'Combo',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'Hair Coloring',
        description: 'Professional hair coloring service',
        price: 50.00,
        duration: 60,
        category: 'Hair',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'Shave',
        description: 'Traditional straight razor shave with hot towel',
        price: 30.00,
        duration: 30,
        category: 'Facial',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'Kid\'s Haircut',
        description: 'Haircut for children under 12',
        price: 18.00,
        duration: 20,
        category: 'Hair',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'Deluxe Package',
        description: 'Haircut, beard trim, facial, and scalp massage',
        price: 60.00,
        duration: 75,
        category: 'Combo',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'Facial',
        description: 'Relaxing facial treatment to cleanse and moisturize',
        price: 35.00,
        duration: 30,
        category: 'Facial',
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    await queryInterface.bulkInsert('services', services, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('services', null, {});
  }
}; 