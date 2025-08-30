const { Staff, Service, User } = require('../models');

/**
 * Get barbers data for public site with user details
 */
const getBarbers = async (req, res) => {
  try {
    const staff = await Staff.findAll({
      where: { is_available: true },
      include: [
        {
          model: Service,
          as: 'services',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'user',
          attributes: ['name', 'email', 'phone', 'image']
        }
      ],
      attributes: {
        exclude: ['commission_percentage', 'user_id']
      }
    });

    return res.status(200).json({ success: true, staff });
  } catch (error) {
    console.error('Error getting barbers:', error);
    return res.status(500).json({ success: false, message: 'Error retrieving barbers', error: error.message });
  }
};

module.exports = { getBarbers }; 