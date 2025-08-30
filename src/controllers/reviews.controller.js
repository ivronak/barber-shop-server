const { v4: uuidv4 } = require('uuid');
const { Op, Sequelize } = require('sequelize');
const { Review, Customer, Staff, ActivityLog, User } = require('../models');

/**
 * Get all reviews with pagination and filtering
 */
const getAllReviews = async (req, res) => {
  try {
    const {
      approved,
      staffId,
      sort = 'date_desc',
      page = 1,
      limit = 10,
      q
    } = req.query;
    
    // Build filter condition
    const where = {};
    
    if (approved === 'true') where.is_approved = true;
    else if (approved === 'false') where.is_approved = false;
    
    if (staffId) where.staff_id = staffId;
    
    // Search query
    if (q) {
      const qLike = `%${q.toLowerCase()}%`;
      where[Op.or] = [
        Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('customer_name')), {
          [Op.like]: qLike
        }),
        Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('staff_name')), {
          [Op.like]: qLike
        }),
        Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('text')), {
          [Op.like]: qLike
        })
      ];
    }
    
    // Determine sorting
    const order = [];
    if (sort === 'date_desc') order.push(['date', 'DESC']);
    else if (sort === 'date_asc') order.push(['date', 'ASC']);
    else if (sort === 'rating_desc') order.push(['rating', 'DESC']);
    else if (sort === 'rating_asc') order.push(['rating', 'ASC']);
    
    // Calculate pagination
    const offset = (page - 1) * limit;
    
    // Query reviews
    const { count, rows } = await Review.findAndCountAll({
      where,
      order,
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Staff,
          as: 'staff',
          attributes: ['id'],
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'email', 'role']
            }
          ]
        }
      ]
    });
    
    // Return results
    return res.status(200).json({
      success: true,
      reviews: rows,
      totalCount: count,
      pages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Error getting reviews:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving reviews',
      error: error.message
    });
  }
};

/**
 * Get review by ID
 */
const getReviewById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const review = await Review.findByPk(id, {
      include: [
        {
          model: Customer,
          as: 'customer'
        },
        {
          model: Staff,
          as: 'staff',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'email', 'role']
            }
          ]
        }
      ]
    });
    
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      review
    });
  } catch (error) {
    console.error('Error getting review:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving review',
      error: error.message
    });
  }
};

/**
 * Create a new review
 */
const createReview = async (req, res) => {
  try {
    const {
      customer_id,
      staff_id,
      customer_name,
      staff_name,
      rating,
      text,
      date,
      is_approved = false
    } = req.body;
    
    // Validate required fields
    // Either customer_id or customer_name is required
    // Either staff_id or staff_name is required
    if ((!customer_id && !customer_name) || (!staff_id && !staff_name) || !rating || !date) {
      return res.status(400).json({
        success: false,
        message: 'Missing required review fields'
      });
    }
    
    // Validate rating
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }
    
    // Create review
    const review = await Review.create({
      id: uuidv4(),
      customer_id: customer_id || null,
      staff_id: staff_id || null,
      customer_name,
      staff_name,
      rating,
      text,
      date,
      is_approved
    });
    
    // Log activity
    await ActivityLog.create({
      id: uuidv4(),
      user_id: req.user.id,
      user_name: req.user.name,
      user_role: req.user.role,
      action: 'REVIEW_CREATED',
      details: `Review created for staff member ${staff_id}`
    });
    
    return res.status(201).json({
      success: true,
      review
    });
  } catch (error) {
    console.error('Error creating review:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating review',
      error: error.message
    });
  }
};

/**
 * Approve a review for public display
 */
const approveReview = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find review
    const review = await Review.findByPk(id);
    
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }
    
    // Update approval status
    review.is_approved = true;
    await review.save();
    
    // Log activity
    await ActivityLog.create({
      id: uuidv4(),
      user_id: req.user.id,
      user_name: req.user.name,
      user_role: req.user.role,
      action: 'REVIEW_APPROVED',
      details: `Review #${id} approved for public display`
    });
    
    return res.status(200).json({
      success: true,
      message: 'Review approved successfully',
      review
    });
  } catch (error) {
    console.error('Error approving review:', error);
    return res.status(500).json({
      success: false,
      message: 'Error approving review',
      error: error.message
    });
  }
};

/**
 * Delete a review
 */
const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find review
    const review = await Review.findByPk(id);
    
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }
    
    // Delete review
    await review.destroy();
    
    // Log activity
    await ActivityLog.create({
      id: uuidv4(),
      user_id: req.user.id,
      user_name: req.user.name,
      user_role: req.user.role,
      action: 'REVIEW_DELETED',
      details: `Review #${id} deleted`
    });
    
    return res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting review:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting review',
      error: error.message
    });
  }
};

module.exports = {
  getAllReviews,
  getReviewById,
  createReview,
  approveReview,
  deleteReview
}; 