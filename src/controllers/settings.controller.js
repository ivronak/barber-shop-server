const { 
  BusinessSetting, 
  BusinessHour, 
  GSTRate, 
  GSTComponent,
  ActivityLog,
  Break
} = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../models');
const dayOfWeekUtils = require('../utils/dayOfWeekUtils');

/**
 * Get business settings
 */
exports.getBusinessSettings = async (req, res) => {
  try {
    const settings = await BusinessSetting.findOne();
    
    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'Business settings not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Get business settings error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Update business settings
 */
exports.updateBusinessSettings = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { 
      name, 
      address, 
      phone, 
      email, 
      logo, 
      slot_duration, 
      tax_rate, 
      allow_discounts, 
      allow_tips, 
      default_commission,
      currency,
      timezone,
      accept_cash,
      accept_card,
      accept_mobile,
      facebook_url,
      instagram_url,
      twitter_url,
      youtube_url,
      custom_payment_methods
    } = req.body;
    
    // Find settings
    let settings = await BusinessSetting.findOne();
    
    if (!settings) {
      // Create new settings if not found
      settings = await BusinessSetting.create({
        name: name || 'The Barber Shop',
        address: address || '123 Main Street, Anytown, USA',
        phone: phone || '555-123-4567',
        email: email || 'info@barbershop.com',
        logo,
        slot_duration: slot_duration || 30,
        tax_rate: tax_rate || 0.00,
        allow_discounts: allow_discounts !== undefined ? allow_discounts : true,
        allow_tips: allow_tips !== undefined ? allow_tips : true,
        default_commission: default_commission || 0.00,
        currency: currency || 'USD',
        timezone: timezone || 'UTC',
        accept_cash: accept_cash !== undefined ? accept_cash : true,
        accept_card: accept_card !== undefined ? accept_card : true,
        accept_mobile: accept_mobile !== undefined ? accept_mobile : false,
        facebook_url,
        instagram_url,
        twitter_url,
        youtube_url,
        custom_payment_methods: custom_payment_methods || []
      }, { transaction });
    } else {
      // Update existing settings
      await settings.update({
        name: name || settings.name,
        address: address || settings.address,
        phone: phone || settings.phone,
        email: email || settings.email,
        logo: logo !== undefined ? logo : settings.logo,
        slot_duration: slot_duration || settings.slot_duration,
        tax_rate: tax_rate !== undefined ? tax_rate : settings.tax_rate,
        allow_discounts: allow_discounts !== undefined ? allow_discounts : settings.allow_discounts,
        allow_tips: allow_tips !== undefined ? allow_tips : settings.allow_tips,
        default_commission: default_commission !== undefined ? default_commission : settings.default_commission,
        currency: currency || settings.currency,
        timezone: timezone || settings.timezone,
        accept_cash: accept_cash !== undefined ? accept_cash : settings.accept_cash,
        accept_card: accept_card !== undefined ? accept_card : settings.accept_card,
        accept_mobile: accept_mobile !== undefined ? accept_mobile : settings.accept_mobile,
        facebook_url: facebook_url !== undefined ? facebook_url : settings.facebook_url,
        instagram_url: instagram_url !== undefined ? instagram_url : settings.instagram_url,
        twitter_url: twitter_url !== undefined ? twitter_url : settings.twitter_url,
        youtube_url: youtube_url !== undefined ? youtube_url : settings.youtube_url,
        custom_payment_methods: custom_payment_methods !== undefined ? custom_payment_methods : settings.custom_payment_methods
      }, { transaction });
    }
    
    // Log activity if user is authenticated
    if (req.user) {
      await ActivityLog.create({
        user_id: req.user.id,
        user_name: req.user.name,
        user_role: req.user.role,
        action: 'Update Business Settings',
        details: 'Updated business settings'
      }, { transaction });
    }
    
    await transaction.commit();
    
    return res.status(200).json({
      success: true,
      settings
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Update business settings error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get business hours
 */
exports.getBusinessHours = async (req, res) => {
  try {
    const hours = await BusinessHour.findAll({
      include: [{
        model: Break,
        as: 'breaks'
      }]
    });
    
    // Sort days to ensure consistent order with Sunday first
    const sortedHours = hours.sort((a, b) => {
      const dayOrder = {
        'sunday': 0,
        'monday': 1,
        'tuesday': 2,
        'wednesday': 3,
        'thursday': 4,
        'friday': 5,
        'saturday': 6
      };
      return dayOrder[a.day_of_week] - dayOrder[b.day_of_week];
    });
    
    return res.status(200).json({
      success: true,
      hours: sortedHours
    });
  } catch (error) {
    console.error('Get business hours error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Update business hours
 */
exports.updateBusinessHours = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { hours } = req.body;
    
    // Validate request body
    if (!hours || !Array.isArray(hours)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Hours array is required'
      });
    }
    
    const updatedHours = [];
    
    for (const hour of hours) {
      if (!hour.day_of_week) {
        continue; // Skip invalid entries
      }
      
      // Find or create business hour
      const [businessHour] = await BusinessHour.findOrCreate({
        where: { day_of_week: hour.day_of_week },
        defaults: {
          open_time: hour.open_time,
          close_time: hour.close_time
        },
        transaction
      });
      
      // Update if found
      if (businessHour) {
        await businessHour.update({
          open_time: hour.open_time,
          close_time: hour.close_time
        }, { transaction });
        
        updatedHours.push(businessHour);
      }
    }
    
    // Log activity if user is authenticated
    if (req.user) {
      await ActivityLog.create({
        user_id: req.user.id,
        user_name: req.user.name,
        user_role: req.user.role,
        action: 'Update Business Hours',
        details: 'Updated business hours'
      }, { transaction });
    }
    
    await transaction.commit();
    
    return res.status(200).json({
      success: true,
      hours: updatedHours
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Update business hours error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get breaks for a specific business hour
 */
exports.getBreaks = async (req, res) => {
  try {
    const { businessHourId } = req.params;
    
    // Validate business hour ID
    if (!businessHourId) {
      return res.status(400).json({
        success: false,
        message: 'Business hour ID is required'
      });
    }
    
    // Find business hour
    const businessHour = await BusinessHour.findByPk(businessHourId, {
      include: [{
        model: Break,
        as: 'breaks'
      }]
    });
    
    if (!businessHour) {
      return res.status(404).json({
        success: false,
        message: 'Business hour not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      breaks: businessHour.breaks || []
    });
  } catch (error) {
    console.error('Get breaks error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Create a new break
 */
exports.createBreak = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { businessHourId } = req.params;
    const { name, start_time, end_time, staff_id, day_of_week } = req.body;
    
    // Validate required fields
    if (!businessHourId || !name || !start_time || !end_time) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Business hour ID, name, start time and end time are required'
      });
    }
    
    // Check if business hour exists
    const businessHour = await BusinessHour.findByPk(businessHourId);
    
    if (!businessHour) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Business hour not found'
      });
    }
    
    // Convert day_of_week to string if it's a number
    let processedDayOfWeek = day_of_week;
    if (typeof day_of_week === 'number' && day_of_week >= 0 && day_of_week <= 6) {
      processedDayOfWeek = dayOfWeekUtils.getDayNameFromNumber(day_of_week);
    }
    
    // Create break
    const newBreak = await Break.create({
      business_hour_id: businessHourId,
      name,
      start_time,
      end_time,
      staff_id: staff_id || null,
      day_of_week: processedDayOfWeek !== undefined ? processedDayOfWeek : null
    }, { transaction });
    
    // Log activity if user is authenticated
    if (req.user) {
      await ActivityLog.create({
        user_id: req.user.id,
        user_name: req.user.name,
        user_role: req.user.role,
        action: 'Create Break',
        details: `Created break "${name}" for ${businessHour.day_of_week}`
      }, { transaction });
    }
    
    await transaction.commit();
    
    return res.status(201).json({
      success: true,
      break: newBreak
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Create break error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Update a break
 */
exports.updateBreak = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { breakId } = req.params;
    const { name, start_time, end_time, staff_id, day_of_week } = req.body;
    
    // Validate required fields
    if (!breakId) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Break ID is required'
      });
    }
    
    // Find break
    const breakToUpdate = await Break.findByPk(breakId);
    
    if (!breakToUpdate) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Break not found'
      });
    }
    
    // Convert day_of_week to string if it's a number
    let processedDayOfWeek = day_of_week;
    if (typeof day_of_week === 'number' && day_of_week >= 0 && day_of_week <= 6) {
      processedDayOfWeek = dayOfWeekUtils.getDayNameFromNumber(day_of_week);
    }
    
    // Update break
    await breakToUpdate.update({
      name: name || breakToUpdate.name,
      start_time: start_time || breakToUpdate.start_time,
      end_time: end_time || breakToUpdate.end_time,
      staff_id: staff_id !== undefined ? staff_id : breakToUpdate.staff_id,
      day_of_week: processedDayOfWeek !== undefined ? processedDayOfWeek : breakToUpdate.day_of_week
    }, { transaction });
    
    // Log activity if user is authenticated
    if (req.user) {
      await ActivityLog.create({
        user_id: req.user.id,
        user_name: req.user.name,
        user_role: req.user.role,
        action: 'Update Break',
        details: `Updated break "${breakToUpdate.name}"`
      }, { transaction });
    }
    
    await transaction.commit();
    
    return res.status(200).json({
      success: true,
      break: breakToUpdate
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Update break error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Delete a break
 */
exports.deleteBreak = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { breakId } = req.params;
    
    // Validate required fields
    if (!breakId) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Break ID is required'
      });
    }
    
    // Find break
    const breakToDelete = await Break.findByPk(breakId);
    
    if (!breakToDelete) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Break not found'
      });
    }
    
    // Store break name for activity log
    const breakName = breakToDelete.name;
    
    // Delete break
    await breakToDelete.destroy({ transaction });
    
    // Log activity if user is authenticated
    if (req.user) {
      await ActivityLog.create({
        user_id: req.user.id,
        user_name: req.user.name,
        user_role: req.user.role,
        action: 'Delete Break',
        details: `Deleted break "${breakName}"`
      }, { transaction });
    }
    
    await transaction.commit();
    
    return res.status(200).json({
      success: true,
      message: 'Break deleted successfully'
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Delete break error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get GST rates
 */
exports.getGSTRates = async (req, res) => {
  try {
    const gstRates = await GSTRate.findAll({
      include: ['components'],
      order: [['created_at', 'DESC']]
    });
    
    return res.status(200).json({
      success: true,
      gstRates
    });
  } catch (error) {
    console.error('Get GST rates error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Update GST rates
 */
exports.updateGSTRates = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { gstRates } = req.body;
    
    // Validate request body
    if (!gstRates || !Array.isArray(gstRates)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'GST rates array is required'
      });
    }
    
    // Get current active rate
    const currentActiveRate = await GSTRate.findOne({
      where: { is_active: true }
    });
    
    // Process each GST rate
    const updatedRates = [];
    
    for (const rate of gstRates) {
      // Skip if missing required fields
      if (!rate.name || !rate.components || !Array.isArray(rate.components)) {
        continue;
      }
      
      // Calculate total rate from components
      const totalRate = rate.components.reduce((sum, component) => {
        return sum + (parseFloat(component.rate) || 0);
      }, 0);
      
      let gstRate;
      
      if (rate.id) {
        // Update existing rate
        gstRate = await GSTRate.findByPk(rate.id);
        
        if (gstRate) {
          await gstRate.update({
            name: rate.name,
            is_active: rate.is_active || false,
            total_rate: totalRate
          }, { transaction });
          
          // Delete existing components
          await GSTComponent.destroy({
            where: { gst_rate_id: gstRate.id },
            transaction
          });
        }
      } else {
        // Create new rate
        gstRate = await GSTRate.create({
          name: rate.name,
          is_active: rate.is_active || false,
          total_rate: totalRate
        }, { transaction });
      }
      
      if (gstRate) {
        // Create components
        for (const component of rate.components) {
          if (!component.name || !component.rate) {
            continue;
          }
          
          await GSTComponent.create({
            gst_rate_id: gstRate.id,
            name: component.name,
            rate: component.rate
          }, { transaction });
        }
        
        // If setting this rate to active, deactivate others
        if (rate.is_active && (!currentActiveRate || currentActiveRate.id !== gstRate.id)) {
          await GSTRate.update(
            { is_active: false },
            { 
              where: { 
                id: { [Op.ne]: gstRate.id } 
              },
              transaction
            }
          );
        }
        
        updatedRates.push(gstRate);
      }
    }
    
    // Log activity if user is authenticated
    if (req.user) {
      await ActivityLog.create({
        user_id: req.user.id,
        user_name: req.user.name,
        user_role: req.user.role,
        action: 'Update GST Rates',
        details: 'Updated GST rates configuration'
      }, { transaction });
    }
    
    await transaction.commit();
    
    // Fetch updated rates with components
    const refreshedRates = await GSTRate.findAll({
      include: ['components'],
      order: [['created_at', 'DESC']]
    });
    
    return res.status(200).json({
      success: true,
      gstRates: refreshedRates
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Update GST rates error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Delete a specific GST rate
 */
exports.deleteGSTRate = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    
    if (!id) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'GST rate ID is required'
      });
    }
    
    // Check if rate exists
    const gstRate = await GSTRate.findByPk(id);
    
    if (!gstRate) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'GST rate not found'
      });
    }
    
    // Delete associated components first
    await GSTComponent.destroy({
      where: { gst_rate_id: id },
      transaction
    });
    
    // Delete the rate
    await gstRate.destroy({ transaction });
    
    // Log activity if user is authenticated
    if (req.user) {
      await ActivityLog.create({
        user_id: req.user.id,
        user_name: req.user.name,
        user_role: req.user.role,
        action: 'Delete GST Rate',
        details: `Deleted GST rate: ${gstRate.name}`
      }, { transaction });
    }
    
    await transaction.commit();
    
    return res.status(200).json({
      success: true,
      message: 'GST rate deleted successfully'
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Delete GST rate error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Batch update business hours and breaks
 */
exports.batchUpdateBusinessHoursAndBreaks = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { hours: hoursData, breakChanges } = req.body;
    
    // Process business hours if provided
    if (hoursData && Array.isArray(hoursData)) {
      for (const hour of hoursData) {
        if (!hour.day_of_week) {
          continue; // Skip invalid entries
        }
        
        // Find or create business hour
        const [businessHour] = await BusinessHour.findOrCreate({
          where: { day_of_week: hour.day_of_week },
          defaults: {
            open_time: hour.open_time,
            close_time: hour.close_time
          },
          transaction
        });
        
        // Update if found
        if (businessHour) {
          await businessHour.update({
            open_time: hour.open_time,
            close_time: hour.close_time
          }, { transaction });
        }
      }
    }
    
    // Process break changes if provided
    if (breakChanges && typeof breakChanges === 'object') {
      // Process break creations
      if (breakChanges.create && Array.isArray(breakChanges.create)) {
        for (const item of breakChanges.create) {
          if (!item.dayId && item.dayId !== 0) continue; // Skip if dayId is not provided or is undefined
          if (!item.break || !item.break.name || !item.break.start_time || !item.break.end_time) {
            continue; // Skip invalid entries
          }
          
          // Find the corresponding business hour
          const businessHour = await BusinessHour.findByPk(item.dayId);
          if (!businessHour) continue;
          
          // Use the day_of_week from the business hour if not specified
          const breakDayOfWeek = item.break.day_of_week || businessHour.day_of_week;
          
          await Break.create({
            business_hour_id: item.dayId,
            name: item.break.name,
            start_time: item.break.start_time,
            end_time: item.break.end_time,
            staff_id: item.break.staff_id || null,
            day_of_week: breakDayOfWeek
          }, { transaction });
        }
      }
      
      // Process break updates
      if (breakChanges.update && Array.isArray(breakChanges.update)) {
        for (const item of breakChanges.update) {
          if (!item.id || !item.data) {
            continue; // Skip invalid entries
          }
          
          const breakToUpdate = await Break.findByPk(item.id);
          if (!breakToUpdate) continue;
          
          await breakToUpdate.update({
            name: item.data.name !== undefined ? item.data.name : breakToUpdate.name,
            start_time: item.data.start_time !== undefined ? item.data.start_time : breakToUpdate.start_time,
            end_time: item.data.end_time !== undefined ? item.data.end_time : breakToUpdate.end_time,
            staff_id: item.data.staff_id !== undefined ? item.data.staff_id : breakToUpdate.staff_id,
            day_of_week: item.data.day_of_week !== undefined ? item.data.day_of_week : breakToUpdate.day_of_week
          }, { transaction });
        }
      }
      
      // Process break deletions
      if (breakChanges.delete && Array.isArray(breakChanges.delete)) {
        for (const breakId of breakChanges.delete) {
          if (!breakId) continue;
          
          const breakToDelete = await Break.findByPk(breakId);
          if (breakToDelete) {
            await breakToDelete.destroy({ transaction });
          }
        }
      }
    }
    
    // Log activity if user is authenticated
    if (req.user) {
      await ActivityLog.create({
        user_id: req.user.id,
        user_name: req.user.name,
        user_role: req.user.role,
        action: 'Batch Update Business Hours and Breaks',
        details: 'Updated business hours and breaks in batch'
      }, { transaction });
    }
    
    await transaction.commit();
    
    // Fetch updated data with breaks included
    const updatedBusinessHours = await BusinessHour.findAll({
      include: [{
        model: Break,
        as: 'breaks'
      }]
    });
    
    // Sort days to ensure consistent order with Sunday first
    const sortedHours = updatedBusinessHours.sort((a, b) => {
      const dayOrder = {
        'sunday': 0,
        'monday': 1,
        'tuesday': 2,
        'wednesday': 3,
        'thursday': 4,
        'friday': 5,
        'saturday': 6
      };
      return dayOrder[a.day_of_week] - dayOrder[b.day_of_week];
    });
    
    return res.status(200).json({
      success: true,
      hours: sortedHours
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Batch update business hours and breaks error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}; 