const { User } = require('../models');
const { Op } = require('sequelize');

/**
 * Get all users with pagination and optional search by name / email / phone
 */
exports.getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      role
    } = req.query;

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const pageLimit = Math.max(parseInt(limit, 10) || 10, 1);

    const whereClause = {};

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } }
      ];
    }

    // Optional role-based filtering (e.g., ?role=admin or ?role=admin,billing)
    if (role) {
      // Allow comma-separated roles (e.g., role=admin,billing)
      const roles = role.split(',').map(r => r.trim()).filter(Boolean);

      if (roles.length === 1) {
        // If single role requested is 'admin', also include 'billing'
        if (roles[0] === 'admin') {
          whereClause.role = { [Op.in]: ['admin', 'billing'] };
        } else {
          // Single role filter
          whereClause.role = roles[0];
        }
      } else if (roles.length > 1) {
        // Multiple roles filter using IN clause
        whereClause.role = { [Op.in]: roles };
      }
    }

    const { rows: users, count: totalCount } = await User.findAndCountAll({
      where: whereClause,
      limit: pageLimit,
      offset: (pageNumber - 1) * pageLimit,
      order: [['name', 'ASC']],
      attributes: { exclude: ['password'] }
    });

    return res.json({
      success: true,
      users,
      totalCount,
      pages: Math.ceil(totalCount / pageLimit),
      currentPage: pageNumber,
      itemsPerPage: pageLimit
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch users', error: error.message });
  }
};

/**
 * Get single user by ID
 */
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id, { attributes: { exclude: ['password'] } });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({ success: true, user });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch user', error: error.message });
  }
};

/**
 * Create a new user (admin only)
 */
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, phone, role = 'staff', image } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }

    // Check existing email
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already in use' });
    }

    const user = await User.create({ name, email, password, phone, role, image });

    const safeUser = user.toJSON();
    delete safeUser.password;

    return res.status(201).json({ success: true, user: safeUser });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create user', error: error.message });
  }
};

/**
 * Update an existing user (admin only)
 */
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, role, password, image } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Prevent email duplication
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ where: { email } });
      if (emailExists) {
        return res.status(409).json({ success: false, message: 'Email already in use' });
      }
    }

    // Build update payload, excluding empty password to avoid validation errors
    const updateData = { name, email, phone, role, image };
    if (password && password.trim().length > 0) {
      updateData.password = password;
    }

    await user.update(updateData);

    const safeUser = user.toJSON();
    delete safeUser.password;

    return res.json({ success: true, user: safeUser });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update user', error: error.message });
  }
};

/**
 * Delete user by ID (admin only)
 */
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await user.destroy();

    return res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete user', error: error.message });
  }
}; 