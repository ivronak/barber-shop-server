const db = require('../models');
const { validateRequestBody } = require('../utils/validators');

/**
 * Get all products with pagination, sorting and filtering
 */
const getAllProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sort = req.query.sort || 'name_asc';
    const category = req.query.category;
    const search = req.query.search;
    
    // Build sorting options
    let order;
    switch (sort) {
      case 'name_asc':
        order = [['name', 'ASC']];
        break;
      case 'name_desc':
        order = [['name', 'DESC']];
        break;
      case 'price_asc':
        order = [['price', 'ASC']];
        break;
      case 'price_desc':
        order = [['price', 'DESC']];
        break;
      case 'stock_asc':
        order = [['stock', 'ASC']];
        break;
      case 'stock_desc':
        order = [['stock', 'DESC']];
        break;
      case 'newest':
        order = [['created_at', 'DESC']];
        break;
      default:
        order = [['name', 'ASC']];
    }
    
    // Build where condition for filtering
    const where = {};
    
    if (category) {
      where.category = category;
    }
    
    if (search) {
      where.name = { [db.Sequelize.Op.like]: `%${search}%` };
    }
    
    // Query products
    const { count, rows: products } = await db.Product.findAndCountAll({
      where,
      order,
      limit,
      offset,
    });
    
    const totalPages = Math.ceil(count / limit);
    
    return res.status(200).json({
      success: true,
      products,
      totalCount: count,
      pages: totalPages,
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: error.message,
    });
  }
};

/**
 * Get a single product by ID
 */
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await db.Product.findByPk(id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }
    
    return res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching product',
      error: error.message,
    });
  }
};

/**
 * Create a new product
 */
const createProduct = async (req, res) => {
  try {
    // Validate request body
    const validationErrors = validateRequestBody(req.body, ['name', 'category', 'price']);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: validationErrors,
      });
    }
    
    // Create product
    const product = await db.Product.create(req.body);
    
    // Log activity to console
    
    
    return res.status(201).json({
      success: true,
      product,
      message: 'Product created successfully',
    });
  } catch (error) {
    console.error('Error creating product:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating product',
      error: error.message,
    });
  }
};

/**
 * Update an existing product
 */
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await db.Product.findByPk(id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }
    
    // Update product
    await product.update(req.body);
    
    // Log activity to console
    
    
    return res.status(200).json({
      success: true,
      product,
      message: 'Product updated successfully',
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating product',
      error: error.message,
    });
  }
};

/**
 * Delete a product
 */
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await db.Product.findByPk(id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }
    
    // Get product name before deletion for logging
    const productName = product.name;
    
    // Delete product
    await product.destroy();
    
    // Log activity to console
    
    
    return res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting product',
      error: error.message,
    });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
}; 