const cloudinary = require('cloudinary').v2;

const isConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET &&
  process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name'
);

if (isConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

/**
 * Upload buffer or base64 to Cloudinary with fallback
 * @param {Buffer|string} fileBuffer
 * @param {Object} options
 * @returns {Promise<{ url: string, public_id?: string, isFallback: boolean }>}
 */
async function uploadToCloudinary(fileBuffer, options = {}) {
  if (!isConfigured) {
    // Graceful fallback: return a base64 data URL or placeholder while remaining fully runnable
    const mime = options.mime || 'image/png';
    const base64 = Buffer.isBuffer(fileBuffer)
      ? fileBuffer.toString('base64')
      : fileBuffer;
    return {
      url: `data:${mime};base64,${base64}`,
      isFallback: true,
      message: 'Cloudinary credentials not configured; stored as inline asset.'
    };
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'cems_uploads',
        resource_type: options.resource_type || 'auto',
        ...options
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error.message);
          // Fall back gracefully rather than crashing the request
          const mime = options.mime || 'image/png';
          const base64 = Buffer.isBuffer(fileBuffer) ? fileBuffer.toString('base64') : '';
          return resolve({
            url: `data:${mime};base64,${base64}`,
            isFallback: true,
            warning: error.message
          });
        }
        resolve({
          url: result.secure_url,
          public_id: result.public_id,
          isFallback: false
        });
      }
    );

    if (Buffer.isBuffer(fileBuffer)) {
      uploadStream.end(fileBuffer);
    } else {
      const buffer = Buffer.from(fileBuffer, 'base64');
      uploadStream.end(buffer);
    }
  });
}

module.exports = {
  cloudinary,
  isConfigured,
  uploadToCloudinary
};

