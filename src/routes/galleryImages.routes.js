const express = require('express');
const router = express.Router();
const galleryImagesController = require('../controllers/galleryImages.controller');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');

// Protect all routes with admin auth
router.use(verifyToken, isAdmin);

router.get('/', galleryImagesController.getAllImages);
router.post('/', galleryImagesController.createImage);
router.put('/:id', galleryImagesController.updateImage);
router.delete('/:id', galleryImagesController.deleteImage);

module.exports = router; 