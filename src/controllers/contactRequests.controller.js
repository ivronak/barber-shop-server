const { ContactRequest } = require('../models');

/**
 * Get all contact requests (Admin only)
 */
const getContactRequests = async (req, res) => {
  try {
    const requests = await ContactRequest.findAll({
      order: [['created_at', 'DESC']],
      attributes: ['id', 'name', 'email', 'phone', 'subject', 'message', 'created_at'],
    });

    return res.status(200).json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error('Error fetching contact requests:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch contact requests',
      error: error.message,
    });
  }
};

module.exports = {
  getContactRequests,
}; 