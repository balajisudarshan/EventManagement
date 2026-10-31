const QRCode = require('qrcode');

/**
 * Generate a QR code as a base64 Data URL
 * @param {string} text - Payload to encode
 * @returns {Promise<string>}
 */
async function generateQrDataUrl(text) {
  try {
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 300,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.error('QR code generation error:', err);
    throw err;
  }
}

/**
 * Generate a QR code buffer for PDF embedding
 * @param {string} text
 * @returns {Promise<Buffer>}
 */
async function generateQrBuffer(text) {
  try {
    return await QRCode.toBuffer(text, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 250
    });
  } catch (err) {
    console.error('QR buffer error:', err);
    throw err;
  }
}

module.exports = {
  generateQrDataUrl,
  generateQrBuffer
};

