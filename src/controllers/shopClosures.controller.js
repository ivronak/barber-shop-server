const { ShopClosure, ActivityLog } = require('../models');
const { sequelize } = require('../models');
const { v4: uuidv4 } = require('uuid');

/**
 * Get all shop closures
 */
exports.getAllShopClosures = async (req, res) => {
  try {
    const closures = await ShopClosure.findAll({
      order: [['date', 'ASC']]
    });
    
    return res.status(200).json({
      success: true,
      closures
    });
  } catch (error) {
    console.error('Get shop closures error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get shop closure by ID
 */
exports.getShopClosureById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const closure = await ShopClosure.findByPk(id);
    
    if (!closure) {
      return res.status(404).json({
        success: false,
        message: 'Shop closure not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      closure
    });
  } catch (error) {
    console.error('Get shop closure error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Create shop closure
 */
exports.createShopClosure = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { date, reason, is_full_day, start_time, end_time } = req.body;
    
    // Validate request body
    if (!date) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Date is required'
      });
    }
    
    // NEW VALIDATION: Prevent past or same-day closures
    const today = new Date();
    today.setHours(0, 0, 0, 0); // normalize
    const closureDateObj = new Date(date);
    if (closureDateObj <= today) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Shop closure date must be a future date'
      });
    }
    
    if (!reason) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Reason is required'
      });
    }
    
    // NEW VALIDATION: If partial day, ensure valid times
    if (!is_full_day) {
      if (!start_time || !end_time) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Start and end times are required for partial day closures'
        });
      }
      if (start_time >= end_time) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Start time must be earlier than end time'
        });
      }
    }
    
    // Check if closure already exists for this date
    const existingClosure = await ShopClosure.findOne({
      where: { date }
    });
    
    if (existingClosure) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'A closure already exists for this date'
      });
    }
    
    // Create new shop closure
    const closure = await ShopClosure.create({
      id: uuidv4(),
      date,
      reason,
      is_full_day: is_full_day !== undefined ? is_full_day : true,
      start_time: !is_full_day ? start_time : null,
      end_time: !is_full_day ? end_time : null
    }, { transaction });
    
    // Log activity if user is authenticated
    if (req.user) {
      await ActivityLog.create({
        id: uuidv4(),
        user_id: req.user.id,
        user_name: req.user.name,
        user_role: req.user.role,
        action: 'Create Shop Closure',
        details: `Created shop closure for ${date}`
      }, { transaction });
    }
    
    await transaction.commit();
    
    return res.status(201).json({
      success: true,
      closure
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Create shop closure error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Update shop closure
 */
exports.updateShopClosure = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { date, reason, is_full_day, start_time, end_time } = req.body;
    
    // Find closure
    const closure = await ShopClosure.findByPk(id);
    
    if (!closure) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Shop closure not found'
      });
    }
    
    // NEW VALIDATION SECTION BEFORE UPDATE
    // If date is being updated, ensure it is in the future and not duplicated
    const newDate = date || closure.date;
    const normalizedToday = new Date();
    normalizedToday.setHours(0, 0, 0, 0);
    const newDateObj = new Date(newDate);
    if (newDateObj <= normalizedToday) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Shop closure date must be a future date'
      });
    }

    // Prevent duplicate date (excluding current record)
    const duplicate = await ShopClosure.findOne({ where: { date: newDate } });
    if (duplicate && duplicate.id !== id) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'A closure already exists for this date'
      });
    }

    // Validate time range if applicable
    const isFullDayToUse = is_full_day !== undefined ? is_full_day : closure.is_full_day;
    const startTimeToUse = !isFullDayToUse ? (start_time || closure.start_time) : null;
    const endTimeToUse = !isFullDayToUse ? (end_time || closure.end_time) : null;
    if (!isFullDayToUse) {
      if (!startTimeToUse || !endTimeToUse) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Start and end times are required for partial day closures'
        });
      }
      if (startTimeToUse >= endTimeToUse) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Start time must be earlier than end time'
        });
      }
    }

    // Update closure
    await closure.update({
      date: newDate,
      reason: reason || closure.reason,
      is_full_day: is_full_day !== undefined ? is_full_day : closure.is_full_day,
      start_time: !isFullDayToUse ? startTimeToUse : null,
      end_time: !isFullDayToUse ? endTimeToUse : null
    }, { transaction });
    
    // Log activity if user is authenticated
    if (req.user) {
      await ActivityLog.create({
        id: uuidv4(),
        user_id: req.user.id,
        user_name: req.user.name,
        user_role: req.user.role,
        action: 'Update Shop Closure',
        details: `Updated shop closure for ${closure.date}`
      }, { transaction });
    }
    
    await transaction.commit();
    
    return res.status(200).json({
      success: true,
      closure
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Update shop closure error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Delete shop closure
 */
exports.deleteShopClosure = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    
    // Find closure
    const closure = await ShopClosure.findByPk(id);
    
    if (!closure) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Shop closure not found'
      });
    }
    
    const closureDate = closure.date;
    
    // Delete closure
    await closure.destroy({ transaction });
    
    // Log activity if user is authenticated
    if (req.user) {
      await ActivityLog.create({
        id: uuidv4(),
        user_id: req.user.id,
        user_name: req.user.name,
        user_role: req.user.role,
        action: 'Delete Shop Closure',
        details: `Deleted shop closure for ${closureDate}`
      }, { transaction });
    }
    
    await transaction.commit();
    
    return res.status(200).json({
      success: true,
      message: 'Shop closure deleted successfully'
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Delete shop closure error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}; 