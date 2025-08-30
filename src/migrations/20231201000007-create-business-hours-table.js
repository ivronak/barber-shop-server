'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('business_hours', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      day_of_week: {
        type: Sequelize.ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
        allowNull: false
      },
      open_time: {
        type: Sequelize.TIME,
        allowNull: true
      },
      close_time: {
        type: Sequelize.TIME,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        onUpdate: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add unique constraint on day_of_week
    await queryInterface.addConstraint('business_hours', {
      fields: ['day_of_week'],
      type: 'unique',
      name: 'business_hours_day_unique'
    });

    // Insert default business hours
    await queryInterface.bulkInsert('business_hours', [
      {
        day_of_week: 'monday',
        open_time: '09:00:00',
        close_time: '18:00:00',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        day_of_week: 'tuesday',
        open_time: '09:00:00',
        close_time: '18:00:00',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        day_of_week: 'wednesday',
        open_time: '09:00:00',
        close_time: '18:00:00',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        day_of_week: 'thursday',
        open_time: '09:00:00',
        close_time: '18:00:00',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        day_of_week: 'friday',
        open_time: '09:00:00',
        close_time: '18:00:00',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        day_of_week: 'saturday',
        open_time: '10:00:00',
        close_time: '16:00:00',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        day_of_week: 'sunday',
        open_time: null,
        close_time: null,
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('business_hours');
  }
}; 