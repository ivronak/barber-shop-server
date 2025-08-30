const { Op } = require('sequelize');
const { ActivityLog } = require('../models');

/**
 * Get activity logs with pagination and filtering
 */
const getActivityLogs = async (req, res) => {
  try {
    const {
      userId,
      action,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20
    } = req.query;
    
    // Build filter condition
    const where = {};
    
    if (userId) where.user_id = userId;
    if (action) where.action = action;
    
    if (dateFrom && dateTo) {
      where.timestamp = {
        [Op.between]: [new Date(dateFrom), new Date(dateTo)]
      };
    } else if (dateFrom) {
      where.timestamp = { [Op.gte]: new Date(dateFrom) };
    } else if (dateTo) {
      where.timestamp = { [Op.lte]: new Date(dateTo) };
    }
    
    // Calculate pagination
    const offset = (page - 1) * limit;
    
    // Query logs
    const { count, rows } = await ActivityLog.findAndCountAll({
      where,
      order: [['timestamp', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    // Return results
    return res.status(200).json({
      success: true,
      logs: rows,
      totalCount: count,
      pages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Error getting activity logs:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving activity logs',
      error: error.message
    });
  }
};

module.exports = {
  getActivityLogs
}; 