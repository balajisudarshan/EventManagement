const express = require('express');
const {
  getMyCertificates,
  verifyCertificate,
  downloadCertificatePdf,
  generateBulkCertificates,
  issueCertificates,
  listIssuedCertificates,
  searchRecipients,
  revokeCertificate,
  listTemplates,
  getTemplateById,
  upsertTemplate,
  deleteTemplate
} = require('../controllers/certificateController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Public verification route (FR-10.7) - accessible without login
router.get('/verify/:certificateId', verifyCertificate);

// Student certificates (FR-10.5)
router.get('/my', requireAuth, getMyCertificates);

// Organizer / Admin template creator & management
router.get('/templates', requireAuth, requireRole(['ORGANIZER', 'ADMIN']), listTemplates);
router.get('/templates/:id', requireAuth, requireRole(['ORGANIZER', 'ADMIN']), getTemplateById);
router.post('/templates', requireAuth, requireRole(['ORGANIZER', 'ADMIN']), upsertTemplate);
router.delete('/templates/:id', requireAuth, requireRole(['ORGANIZER', 'ADMIN']), deleteTemplate);

// Organizer / Admin direct certificate issuance & registry
router.get('/recipients/search', requireAuth, requireRole(['ORGANIZER', 'ADMIN']), searchRecipients);
router.get('/issued', requireAuth, requireRole(['ORGANIZER', 'ADMIN']), listIssuedCertificates);
router.post('/issue', requireAuth, requireRole(['ORGANIZER', 'ADMIN']), issueCertificates);

// Organizer / Admin event-based bulk issuance & status revocation
router.post('/events/:eventId/generate', requireAuth, requireRole(['ORGANIZER', 'ADMIN']), generateBulkCertificates);
router.patch('/:id/status', requireAuth, requireRole(['ORGANIZER', 'ADMIN']), revokeCertificate);

// Public or authenticated PDF download
router.get('/:id/download.pdf', downloadCertificatePdf);

module.exports = router;
