const { ServiceCategory, Service, ActivityLog } = require('../models');
const { Op } = require('sequelize');
const { Sequelize } = require('sequelize');

/**
 * Get all service categories with optional search
 */
exports.getAllCategories = async (req, res) => {
  try {
    const { search, page = 1, limit = 100, isActive } = req.query;

    const queryOptions = {
      where: {},
      order: [['name', 'ASC']],
      limit: parseInt(limit, 10),
      offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
    };

    if (search) {
      queryOptions.where.name = { [Op.like]: `%${search}%` };
    }

    if (isActive !== undefined && isActive !== 'all') {
      queryOptions.where.is_active = String(isActive).toLowerCase() === 'true';
    }

    const { count, rows } = await ServiceCategory.findAndCountAll(queryOptions);

    return res.status(200).json({
      success: true,
      categories: rows,
      totalCount: count,
      pages: Math.ceil(count / queryOptions.limit),
    });
  } catch (error) {
    console.error('Get categories error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Create new category
 */
exports.createCategory = async (req, res) => {
  try {
    const { name, description, imageUrl, is_active } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    const existing = await ServiceCategory.findOne({ where: { name } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Category already exists' });
    }

    const category = await ServiceCategory.create({ name, description, imageUrl, is_active: is_active !== undefined ? is_active : true });

    if (req.user) {
      await ActivityLog.create({
        user_id: req.user.id,
        user_name: req.user.name,
        user_role: req.user.role,
        action: 'Create Service Category',
        details: `Created new category: ${name}`,
      });
    }

    return res.status(201).json({ success: true, category });
  } catch (error) {
    console.error('Create category error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Update category
 */
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, imageUrl, is_active } = req.body;

    const category = await ServiceCategory.findByPk(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const previousActive = category.is_active;
    await category.update({ name: name || category.name, description, imageUrl, is_active: is_active !== undefined ? is_active : category.is_active });

    if (req.user) {
      await ActivityLog.create({
        user_id: req.user.id,
        user_name: req.user.name,
        user_role: req.user.role,
        action: 'Update Service Category',
        details: `Updated category: ${category.name}`,
      });
    }

    // If category is being deactivated, deactivate all its services
    if (previousActive && is_active === false) {
      await Service.update({ is_active: false }, { where: { category_id: category.id } });
    }

    return res.status(200).json({ success: true, category });
  } catch (error) {
    console.error('Update category error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Delete category
 */
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await ServiceCategory.findByPk(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // Soft delete category and cascade soft delete to its services
    await category.update({
      is_deleted: true,
      deleted_at: new Date(),
      name: category.name + '_deleted',
    });

    // Soft delete all services under this category
    await Service.update(
      {
        is_deleted: true,
        deleted_at: new Date(),
        name: Sequelize.fn('concat', Sequelize.col('name'), '_deleted'),
      },
      {
        where: { category_id: category.id, is_deleted: false },
      }
    );

    if (req.user) {
      await ActivityLog.create({
        user_id: req.user.id,
        user_name: req.user.name,
        user_role: req.user.role,
        action: 'Delete Service Category',
        details: `Soft deleted category: ${category.name}`,
      });
    }

    return res.status(200).json({ success: true, message: 'Category deleted' });
  } catch (error) {
    console.error('Delete category error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}; 