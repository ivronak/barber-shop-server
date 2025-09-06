const { Service, Staff, ActivityLog, ServiceCategory } = require('../models');
const { Op } = require('sequelize');

/**
 * Get all services with optional filtering and pagination
 */
exports.getAllServices = async (req, res) => {
  try {
    const {
      search,
      categoryId, // single category id filter
      categoryIds, // comma-separated list of ids
      category, // legacy category name
      isActive, // optional filter true/false
      minPrice,
      maxPrice,
      minDuration,
      maxDuration,
      sort,
      page = 1,
      limit = 10
    } = req.query;

    // Prepare query options
    const queryOptions = {
      where: {},
      order: [],
      limit: parseInt(limit, 10),
      offset: (parseInt(page, 10) - 1) * parseInt(limit, 10)
    };

    // 1. Search filter (name OR description)
    if (search) {
      queryOptions.where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    // 2. Category filters – single or multiple (by id)
    if (categoryId && categoryId !== 'all') {
      queryOptions.where.category_id = categoryId;
    }

    if (categoryIds) {
      const idArray = categoryIds.split(',').map((c) => c.trim()).filter(Boolean);
      if (idArray.length > 0) {
        queryOptions.where.category_id = { [Op.in]: idArray };
      }
    }

    // Legacy category name filter
    if (!categoryId && category) {
      // Find category by name
      const cat = await ServiceCategory.findOne({ where: { name: category } });
      if (cat) queryOptions.where.category_id = cat.id;
    }

    // 3. Price range filter
    const minPriceFloat = parseFloat(minPrice);
    const maxPriceFloat = parseFloat(maxPrice);
    if (!isNaN(minPriceFloat) || !isNaN(maxPriceFloat)) {
      queryOptions.where.price = {};
      if (!isNaN(minPriceFloat)) {
        queryOptions.where.price[Op.gte] = minPriceFloat;
      }
      if (!isNaN(maxPriceFloat)) {
        queryOptions.where.price[Op.lte] = maxPriceFloat;
      }
    }

    // 4. Duration range filter (minutes)
    const minDurationInt = parseInt(minDuration);
    const maxDurationInt = parseInt(maxDuration);
    if (!isNaN(minDurationInt) || !isNaN(maxDurationInt)) {
      queryOptions.where.duration = {};
      if (!isNaN(minDurationInt)) {
        queryOptions.where.duration[Op.gte] = minDurationInt;
      }
      if (!isNaN(maxDurationInt)) {
        queryOptions.where.duration[Op.lte] = maxDurationInt;
      }
    }

    // 5. Active filter
    if (isActive !== undefined) {
      const boolVal = String(isActive).toLowerCase() === 'true';
      queryOptions.where.is_active = boolVal;
    }

    // 6. Sorting
    let orderField = 'name';
    let orderDirection = 'ASC';

    if (sort) {
      // Expected format: field_dir e.g., price_desc
      const lastUnderscore = sort.lastIndexOf('_');
      const field = sort.substring(0, lastUnderscore);
      const dir = sort.substring(lastUnderscore + 1);

      switch (field) {
        case 'price':
        case 'duration':
        case 'category':
        case 'name':
          orderField = field;
          break;
        default:
          orderField = 'name';
      }

      orderDirection = dir.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    }

    queryOptions.order = [[orderField, orderDirection]];

    // Execute query
    queryOptions.include = [
      {
        model: ServiceCategory,
        as: 'serviceCategory',
        attributes: ['id', 'name'],
      },
    ];

    const { count, rows: services } = await Service.findAndCountAll(queryOptions);

    return res.status(200).json({
      success: true,
      services,
      totalCount: count,
      pages: Math.ceil(count / parseInt(limit, 10))
    });
  } catch (error) {
    console.error('Get services error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get service by ID
 */
exports.getServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const service = await Service.findByPk(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      service
    });
  } catch (error) {
    console.error('Get service error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Create new service
 */
exports.createService = async (req, res) => {
  try {
    console.log("req.body",req.body)
    let { name, description, price, duration, categoryId: bodyCategoryId, imageUrl, category, is_active,is_tip_eligible } = req.body;
    
    // Legacy support: if categoryId not provided but category name is, look up ID
    if (!bodyCategoryId && category) {
      const catRecord = await ServiceCategory.findOne({ where: { name: category } });
      if (catRecord) bodyCategoryId = catRecord.id;
    }
    console.log('bodyCategoryId',bodyCategoryId)
    // Validate required fields
    if (!name || !price || !duration || !bodyCategoryId) {
      return res.status(400).json({
        success: false,
        message: 'Name, price, duration, and categoryId are required'
      });
    }
    
    // Create service
    const service = await Service.create({
      name,
      description,
      price,
      duration,
      category_id: bodyCategoryId,
      imageUrl,
      is_active: is_active !== undefined ? is_active : true,
      is_tip_eligible
    });
    
    // Log activity if user is authenticated
    if (req.user) {
      await ActivityLog.create({
        user_id: req.user.id,
        user_name: req.user.name,
        user_role: req.user.role,
        action: 'Create Service',
        details: `Created new service: ${name}`
      });
    }
    
    return res.status(201).json({
      success: true,
      service
    });
  } catch (error) {
    console.error('Create service error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Update service
 */
exports.updateService = async (req, res) => {
  try {
    const { id } = req.params;
    let { name, description, price, duration, categoryId: bodyCategoryId, imageUrl, category, is_active: activeFlag,is_tip_eligible:tipFlag } = req.body;
    
    if (!bodyCategoryId && category) {
      const catRecord = await ServiceCategory.findOne({ where: { name: category } });
      if (catRecord) bodyCategoryId = catRecord.id;
    }
    
    // Find service
    const service = await Service.findByPk(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }
    
    // Update service
    await service.update({
      name: name || service.name,
      description: description !== undefined ? description : service.description,
      price: price || service.price,
      duration: duration || service.duration,
      category_id: bodyCategoryId || service.category_id,
      imageUrl: imageUrl !== undefined ? imageUrl : service.imageUrl,
      is_active: activeFlag !== undefined ? activeFlag : service.is_active,
      is_tip_eligible:tipFlag!==undefined?tipFlag:service?.is_tip_eligible
    });
    
    // Log activity if user is authenticated
    if (req.user) {
      await ActivityLog.create({
        user_id: req.user.id,
        user_name: req.user.name,
        user_role: req.user.role,
        action: 'Update Service',
        details: `Updated service: ${service.name}`
      });
    }
    
    return res.status(200).json({
      success: true,
      service
    });
  } catch (error) {
    console.error('Update service error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Delete service
 */
exports.deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find service
    const service = await Service.findByPk(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }
    
    // Store service name for activity log
    const serviceName = service.name;
    
    // Soft delete service: flag, timestamp, and rename to avoid duplicates
    await service.update({
      is_deleted: true,
      deleted_at: new Date(),
      name: service.name + '_deleted',
    });
    
    // Log activity if user is authenticated
    if (req.user) {
      await ActivityLog.create({
        user_id: req.user.id,
        user_name: req.user.name,
        user_role: req.user.role,
        action: 'Delete Service',
        details: `Soft deleted service: ${serviceName}`
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Service deleted successfully'
    });
  } catch (error) {
    console.error('Delete service error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}; 