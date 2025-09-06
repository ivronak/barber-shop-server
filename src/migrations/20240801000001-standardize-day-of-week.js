'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('Starting day of week standardization migration...');

    // 1. Add staff_id to breaks table if it doesn't exist
    try {
      await queryInterface.describeTable('breaks').then(async (tableDefinition) => {
        if (!tableDefinition.staff_id) {
          await queryInterface.addColumn('breaks', 'staff_id', {
            type: Sequelize.UUID,
            allowNull: true,
            references: {
              model: 'staff',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          });
          console.log('Added staff_id column to breaks table');
        }
      });
    } catch (error) {
      console.log('Error checking/adding staff_id column:', error.message);
    }

    // 2. Make business_hour_id nullable
    try {
      await queryInterface.changeColumn('breaks', 'business_hour_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'business_hours',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
      console.log('Made business_hour_id nullable in breaks table');
    } catch (error) {
      console.log('Error making business_hour_id nullable:', error.message);
    }

    // 3. Convert numeric day_of_week to string ENUM in breaks table
    // First, create a temporary column
    try {
      await queryInterface.addColumn('breaks', 'day_of_week_string', {
        type: Sequelize.ENUM('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'),
        allowNull: true
      });
      console.log('Added day_of_week_string column to breaks table');
    } catch (error) {
      console.log('Error adding day_of_week_string column:', error.message);
    }
    
    // Migrate data from numeric day_of_week to string day_of_week
    try {
      const [breaks] = await queryInterface.sequelize.query('SELECT id, day_of_week FROM breaks');
      
      for (const breakItem of breaks) {
        const dayIndex = parseInt(breakItem.day_of_week, 10);
        if (!isNaN(dayIndex) && dayIndex >= 0 && dayIndex <= 6) {
          const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const dayName = dayNames[dayIndex];
          
          await queryInterface.sequelize.query(
            `UPDATE breaks SET day_of_week_string = '${dayName}' WHERE id = ${breakItem.id}`
          );
        }
      }
      console.log('Migrated data from numeric day_of_week to string day_of_week');
    } catch (error) {
      console.log('Error migrating data:', error.message);
    }
    
    // Drop the old column
    try {
      await queryInterface.removeColumn('breaks', 'day_of_week');
      console.log('Removed old day_of_week column from breaks table');
    } catch (error) {
      console.log('Error removing day_of_week column:', error.message);
    }
    
    // Rename the new column
    try {
      await queryInterface.renameColumn('breaks', 'day_of_week_string', 'day_of_week');
      console.log('Renamed day_of_week_string column to day_of_week');
    } catch (error) {
      console.log('Error renaming day_of_week_string to day_of_week:', error.message);
    }

    // 4. Standardize working_hours table day_of_week ENUM order
    try {
      // For MySQL, we need to modify the column directly
      await queryInterface.sequelize.query(`
        ALTER TABLE working_hours 
        MODIFY COLUMN day_of_week 
        ENUM('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday') 
        NOT NULL;
      `);
      console.log('Standardized day_of_week in working_hours table');
    } catch (error) {
      console.log('Error standardizing working_hours day_of_week:', error.message);
    }

    // 5. Standardize business_hours table day_of_week ENUM order
    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE business_hours 
        MODIFY COLUMN day_of_week 
        ENUM('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday') 
        NOT NULL;
      `);
      console.log('Standardized day_of_week in business_hours table');
    } catch (error) {
      console.log('Error standardizing business_hours day_of_week:', error.message);
    }

    console.log('Day of week standardization migration completed');
  },

  async down(queryInterface, Sequelize) {
    console.log('Rolling back day of week standardization...');

    // 1. Convert string day_of_week back to numeric in breaks table
    // First, create a temporary column
    try {
      await queryInterface.addColumn('breaks', 'day_of_week_numeric', {
        type: Sequelize.INTEGER,
        allowNull: true
      });
      
      // Migrate data from string day_of_week to numeric day_of_week
      const [breaks] = await queryInterface.sequelize.query('SELECT id, day_of_week FROM breaks');
      
      for (const breakItem of breaks) {
        const dayName = breakItem.day_of_week;
        if (dayName) {
          const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const dayIndex = dayNames.indexOf(dayName.toLowerCase());
          
          if (dayIndex !== -1) {
            await queryInterface.sequelize.query(
              `UPDATE breaks SET day_of_week_numeric = ${dayIndex} WHERE id = ${breakItem.id}`
            );
          }
        }
      }
      
      // Drop the old column
      await queryInterface.removeColumn('breaks', 'day_of_week');
      
      // Rename the new column
      await queryInterface.renameColumn('breaks', 'day_of_week_numeric', 'day_of_week');
      
      console.log('Reverted day_of_week in breaks table');
    } catch (error) {
      console.log('Error reverting day_of_week in breaks table:', error.message);
    }

    // 2. Make business_hour_id required again
    try {
      await queryInterface.changeColumn('breaks', 'business_hour_id', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'business_hours',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      });
      console.log('Made business_hour_id non-nullable in breaks table');
    } catch (error) {
      console.log('Error reverting business_hour_id:', error.message);
    }

    // 3. Remove staff_id from breaks table
    try {
      await queryInterface.removeColumn('breaks', 'staff_id');
      console.log('Removed staff_id from breaks table');
    } catch (error) {
      console.log('Error removing staff_id column:', error.message);
    }

    // 4. Revert working_hours table
    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE working_hours 
        MODIFY COLUMN day_of_week 
        ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday') 
        NOT NULL;
      `);
      console.log('Reverted day_of_week in working_hours table');
    } catch (error) {
      console.log('Error reverting working_hours day_of_week:', error.message);
    }

    // 5. Revert business_hours table
    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE business_hours 
        MODIFY COLUMN day_of_week 
        ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday') 
        NOT NULL;
      `);
      console.log('Reverted day_of_week in business_hours table');
    } catch (error) {
      console.log('Error reverting business_hours day_of_week:', error.message);
    }

    console.log('Rollback of day of week standardization completed');
  }
};
