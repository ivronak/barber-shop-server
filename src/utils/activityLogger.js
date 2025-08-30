const db = require('../models');

/**
 * Log user activity in the system
 * 
 * @param {Object} data - The activity data to log
 * @param {string} data.user_id - The ID of the user performing the action
 * @param {string} data.action - The action performed (e.g., LOGIN, CREATE_PRODUCT)
 * @param {string} data.details - Additional details about the action
 * @param {string} data.ip_address - IP address of the user
 * @returns {Promise<Object>} The created activity log
 */
const logActivity = async (data) => {
  try {
    // If we have an ActivityLog model, use it to log the activity
    if (db.ActivityLog) {
      return await db.ActivityLog.create({
        user_id: data.user_id,
        action: data.action,
        details: data.details,
        ip_address: data.ip_address,
        created_at: new Date()
      });
    } else {
      // Otherwise, just log to console (helpful for development)
      console.log(`[ACTIVITY LOG] ${new Date().toISOString()} - User ${data.user_id} performed ${data.action}: ${data.details}`);
      return null;
    }
  } catch (error) {
    // Log the error but don't throw - activity logging should not block the main flow
    console.error('Error logging activity:', error);
    return null;
  }
};

module.exports = {
  logActivity,
}; 