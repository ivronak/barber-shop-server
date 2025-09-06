'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    

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
          
        }
      });
    } catch (error) {
      
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
      
    } catch (error) {
      
    }

    // 3. Convert numeric day_of_week to string ENUM in breaks table
    // First, create a temporary column
    try {
      await queryInterface.addColumn('breaks', 'day_of_week_string', {
        type: Sequelize.ENUM('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'),
        allowNull: true
      });
      
    } catch (error) {
      
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
      
    } catch (error) {
      
    }
    
    // Drop the old column
    try {
      await queryInterface.removeColumn('breaks', 'day_of_week');
      
    } catch (error) {
      
    }
    
    // Rename the new column
    try {
      await queryInterface.renameColumn('breaks', 'day_of_week_string', 'day_of_week');
      
    } catch (error) {
      
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
      
    } catch (error) {
      
    }

    // 5. Standardize business_hours table day_of_week ENUM order
    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE business_hours 
        MODIFY COLUMN day_of_week 
        ENUM('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday') 
        NOT NULL;
      `);
      
    } catch (error) {
      
    }

    
  },

  async down(queryInterface, Sequelize) {
    

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
      
      
    } catch (error) {
      
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
      
    } catch (error) {
      
    }

    // 3. Remove staff_id from breaks table
    try {
      await queryInterface.removeColumn('breaks', 'staff_id');
      
    } catch (error) {
      
    }

    // 4. Revert working_hours table
    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE working_hours 
        MODIFY COLUMN day_of_week 
        ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday') 
        NOT NULL;
      `);
      
    } catch (error) {
      
    }

    // 5. Revert business_hours table
    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE business_hours 
        MODIFY COLUMN day_of_week 
        ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday') 
        NOT NULL;
      `);
      
    } catch (error) {
      
    }

    
  }
};
