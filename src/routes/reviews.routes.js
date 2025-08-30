const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');
const reviewsController = require('../controllers/reviews.controller');

// Get all reviews
router.get('/', verifyToken, reviewsController.getAllReviews);

// Get review by ID
router.get('/:id', verifyToken, reviewsController.getReviewById);

// Create new review (only accessible to admin for internal use)
router.post('/', verifyToken, isAdmin, reviewsController.createReview);

// Approve a review for public display
router.put('/:id/approve', verifyToken, isAdmin, reviewsController.approveReview);

// Delete a review
router.delete('/:id', verifyToken, isAdmin, reviewsController.deleteReview);

module.exports = router; 