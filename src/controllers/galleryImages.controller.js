const { GalleryImage } = require('../models');
const { v4: uuidv4 } = require('uuid');

/**
 * Get all gallery images (admin)
 */
const getAllImages = async (req, res) => {
  try {
    const images = await GalleryImage.findAll({
      order: [['display_order', 'ASC']],
    });

    return res.status(200).json({
      success: true,
      images,
    });
  } catch (error) {
    console.error('Error fetching gallery images:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch gallery images',
      error: error.message,
    });
  }
};

/**
 * Create a new gallery image
 */
const createImage = async (req, res) => {
  try {
    const { title, description, url, category, display_order = 0, is_active = true } = req.body;

    if (!title || !url) {
      return res.status(400).json({
        success: false,
        message: 'Title and URL are required',
      });
    }

    const image = await GalleryImage.create({
      id: uuidv4(),
      title,
      description,
      url,
      category,
      display_order,
      is_active,
    });

    return res.status(201).json({
      success: true,
      image,
      message: 'Gallery image added',
    });
  } catch (error) {
    console.error('Error creating gallery image:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create gallery image',
      error: error.message,
    });
  }
};

/**
 * Update an existing gallery image
 */
const updateImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, url, category, display_order, is_active } = req.body;

    const image = await GalleryImage.findByPk(id);
    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found',
      });
    }

    await image.update({ title, description, url, category, display_order, is_active });

    return res.status(200).json({
      success: true,
      image,
      message: 'Gallery image updated',
    });
  } catch (error) {
    console.error('Error updating gallery image:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update gallery image',
      error: error.message,
    });
  }
};

/**
 * Delete a gallery image
 */
const deleteImage = async (req, res) => {
  try {
    const { id } = req.params;
    const image = await GalleryImage.findByPk(id);
    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found',
      });
    }

    await image.destroy();

    return res.status(200).json({
      success: true,
      message: 'Gallery image deleted',
    });
  } catch (error) {
    console.error('Error deleting gallery image:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete gallery image',
      error: error.message,
    });
  }
};

module.exports = {
  getAllImages,
  createImage,
  updateImage,
  deleteImage,
}; 