const express = require('express');
const {
  getMyCertificates,
  verifyCertificate,
  downloadCertificatePdf,
  generateBulkCertificates,
  revokeCertificate,
  upsertTemplate
} = require('../controllers/certificateController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Public verification route (FR-10.7) - accessible without login
router.get('/verify/:certificateId', verifyCertificate);

// Student certificates & PDF download (FR-10.5)
router.get('/my', requireAuth, getMyCertificates);
router.get('/:id/download.pdf', downloadCertificatePdf); // Allow public or authenticated PDF download

// Organizer / Admin issuance, templates & revocation
router.post('/events/:eventId/generate', requireAuth, requireRole(['ORGANIZER', 'ADMIN']), generateBulkCertificates);
router.patch('/:id/status', requireAuth, requireRole(['ORGANIZER', 'ADMIN']), revokeCertificate);
router.post('/templates', requireAuth, requireRole(['ORGANIZER', 'ADMIN']), upsertTemplate);

module.exports = router;

