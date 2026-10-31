const express = require('express');
const multer = require('multer');
const { requireAuth, requireRole } = require('../middleware/auth');
const { uploadToCloudinary, isConfigured } = require('../config/cloudinary');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

/**
 * Upload Image (Banners, Logos, Templates)
 * Protected: Organizers & Admins
 */
router.post('/', requireAuth, requireRole(['ORGANIZER', 'ADMIN']), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const { folder = 'cems_events' } = req.body;
    const result = await uploadToCloudinary(req.file.buffer, {
      folder,
      mime: req.file.mimetype
    });

    return res.json({
      url: result.url,
      isFallback: result.isFallback,
      isCloudinaryConfigured: isConfigured,
      message: result.isFallback ? 'Uploaded via fallback asset storage.' : 'Uploaded successfully to Cloudinary.'
    });
  } catch (err) {
    console.error('File upload error:', err);
    return res.status(500).json({ error: 'File upload processing failed.' });
  }
});

/**
 * Check Cloudinary Status
 */
router.get('/status', (req, res) => {
  return res.json({
    isCloudinaryConfigured: isConfigured,
    cloudName: isConfigured ? process.env.CLOUDINARY_CLOUD_NAME : null
  });
});

module.exports = router;

