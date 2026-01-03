const cloudinary = require('../config/cloudinary');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class UploadService {
  
  /**
   * Upload image to Cloudinary
   */
  async uploadImage(file, folder = 'products') {
    try {
      // Resize and optimize image
      const optimizedImage = await sharp(file.buffer)
        .resize(800, 800, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      // Upload to Cloudinary
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: folder,
            public_id: `${Date.now()}-${uuidv4()}`,
            resource_type: 'image',
            format: 'jpg'
          },
          (error, result) => {
            if (error) {
              logger.error('Cloudinary upload error:', error);
              reject(error);
            } else {
              resolve({
                url: result.secure_url,
                publicId: result.public_id
              });
            }
          }
        );

        uploadStream.end(optimizedImage);
      });
    } catch (error) {
      logger.error('Image processing error:', error);
      throw error;
    }
  }

  /**
   * Upload multiple images
   */
  async uploadMultipleImages(files, folder = 'products') {
    try {
      const uploadPromises = files.map(file => this.uploadImage(file, folder));
      return await Promise.all(uploadPromises);
    } catch (error) {
      logger.error('Multiple image upload error:', error);
      throw error;
    }
  }

  /**
   * Delete image from Cloudinary
   */
  async deleteImage(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      logger.info(`Image deleted: ${publicId}`);
      return result;
    } catch (error) {
      logger.error('Image deletion error:', error);
      throw error;
    }
  }

  /**
   * Delete multiple images
   */
  async deleteMultipleImages(publicIds) {
    try {
      const deletePromises = publicIds.map(id => this.deleteImage(id));
      return await Promise.all(deletePromises);
    } catch (error) {
      logger.error('Multiple image deletion error:', error);
      throw error;
    }
  }
}

module.exports = new UploadService();