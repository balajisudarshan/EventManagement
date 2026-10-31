const prisma = require('../config/prisma');
const { generateCertificatePdf } = require('../utils/pdf');
const { generateQrDataUrl } = require('../utils/qr');
const { uploadToCloudinary } = require('../config/cloudinary');
const { logAuditEvent } = require('../middleware/audit');

/**
 * Generate Unique Certificate ID (e.g. CERT-CEMS-YYYY-XXXXXX)
 */
function generateCertId() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let rand = '';
  for (let i = 0; i < 6; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `CERT-CEMS-${new Date().getFullYear()}-${rand}`;
}

/**
 * Student: Get My Certificates (FR-10.5)
 */
async function getMyCertificates(req, res) {
  try {
    const certificates = await prisma.certificate.findMany({
      where: { userId: req.user.id },
      include: {
        event: {
          include: {
            organizingBody: true
          }
        },
        template: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ certificates });
  } catch (err) {
    console.error('Get my certificates error:', err);
    return res.status(500).json({ error: 'Failed to fetch certificates.' });
  }
}

/**
 * Public: Verify Certificate by ID or QR Code Scan (FR-10.7)
 * Accessible to ANYONE without authentication (Guest, Employers, Evaluators)
 */
async function verifyCertificate(req, res) {
  try {
    const { certificateId } = req.params;

    const cert = await prisma.certificate.findUnique({
      where: { certificateId: certificateId.trim() },
      include: {
        event: {
          include: {
            organizingBody: true
          }
        },
        user: {
          select: { id: true, name: true, rollNo: true, department: true }
        },
        template: true
      }
    });

    if (!cert) {
      return res.status(404).json({
        isValid: false,
        status: 'NOT_FOUND',
        message: 'No certificate found matching the provided Certificate ID.'
      });
    }

    const isValid = cert.status === 'VALID';

    return res.json({
      isValid,
      status: cert.status,
      certificate: {
        certificateId: cert.certificateId,
        recipientName: cert.recipientName,
        eventTitle: cert.eventTitle,
        category: cert.event.category,
        organizingBody: cert.event.organizingBody?.name || 'College Chapter',
        bodyType: cert.event.organizingBody?.type,
        issueDate: cert.issueDate,
        type: cert.type,
        status: cert.status,
        revokeReason: cert.status === 'REVOKED' ? cert.revokeReason : null,
        pdfUrl: cert.pdfUrl
      }
    });
  } catch (err) {
    console.error('Verify certificate error:', err);
    return res.status(500).json({ error: 'Failed to verify certificate.' });
  }
}

/**
 * Download Certificate PDF (FR-10.5)
 */
async function downloadCertificatePdf(req, res) {
  try {
    const { id } = req.params; // certificate id or UUID

    const cert = await prisma.certificate.findFirst({
      where: {
        OR: [{ id }, { certificateId: id }]
      },
      include: {
        event: {
          include: {
            organizingBody: true
          }
        },
        user: true,
        template: true
      }
    });

    if (!cert) {
      return res.status(404).json({ error: 'Certificate not found.' });
    }

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const publicUrl = `${clientUrl}/verify-certificate/${cert.certificateId}`;
    const signatories = cert.template?.signatories || [];

    const pdfBuffer = await generateCertificatePdf({
      certificate: cert,
      event: cert.event,
      user: cert.user,
      signatories,
      publicUrl
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=certificate-${cert.certificateId}.pdf`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('Download certificate PDF error:', err);
    return res.status(500).json({ error: 'Failed to generate certificate PDF.' });
  }
}

/**
 * Organizer / Admin: Bulk Generate Certificates for Event (FR-10.2, FR-10.3, FR-10.4, FR-10.6)
 */
async function generateBulkCertificates(req, res) {
  try {
    const { eventId } = req.params;
    const { templateId, certificateType, overrideAttendanceCheck } = req.body;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        organizingBody: true,
        certificateTemplates: true
      }
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    // FR-10.2: Filter registrants based on attendance rule
    const requireAttendance = overrideAttendanceCheck ? false : event.requiresAttendanceForCert;

    const filter = {
      eventId,
      status: 'CONFIRMED'
    };

    if (requireAttendance) {
      filter.attended = true;
    }

    const eligibleRegistrations = await prisma.registration.findMany({
      where: filter,
      include: {
        user: true,
        certificate: true
      }
    });

    if (eligibleRegistrations.length === 0) {
      return res.status(400).json({
        error: requireAttendance
          ? 'No attendees with confirmed attendance found for this event. Mark attendance before generating certificates.'
          : 'No confirmed registrations found for this event.'
      });
    }

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const effectiveTemplateId = templateId || event.certificateTemplates[0]?.id || null;

    let generatedCount = 0;
    const newlyCreated = [];

    for (const reg of eligibleRegistrations) {
      // If already has certificate, skip unless re-issuing
      if (reg.certificate) {
        continue;
      }

      const certCode = generateCertId();
      const publicVerifyUrl = `${clientUrl}/verify-certificate/${certCode}`;
      const qrCodeUrl = await generateQrDataUrl(publicVerifyUrl);

      const cert = await prisma.certificate.create({
        data: {
          certificateId: certCode,
          registrationId: reg.id,
          eventId,
          userId: reg.userId,
          recipientName: reg.user.name,
          eventTitle: event.title,
          type: certificateType || 'PARTICIPATION',
          templateId: effectiveTemplateId,
          status: 'VALID',
          qrCode: qrCodeUrl
        }
      });

      // Send in-app notification to the student (FR-11.1)
      await prisma.notification.create({
        data: {
          userId: reg.userId,
          title: `Certificate Issued: ${event.title}`,
          message: `Your verifiable certificate of ${cert.type} is ready for download! Certificate ID: ${certCode}.`,
          type: 'CERTIFICATE',
          link: '/dashboard/certificates'
        }
      });

      generatedCount++;
      newlyCreated.push(cert);
    }

    await logAuditEvent({
      actor: req.user,
      action: 'CERTIFICATES_BULK_GENERATED',
      entity: 'Certificate',
      entityId: eventId,
      newValue: { count: generatedCount, type: certificateType || 'PARTICIPATION' },
      req
    });

    return res.status(201).json({
      message: `Generated ${generatedCount} certificates successfully.`,
      generatedCount,
      totalEligible: eligibleRegistrations.length
    });
  } catch (err) {
    console.error('Bulk generate certificates error:', err);
    return res.status(500).json({ error: 'Failed to bulk-generate certificates.' });
  }
}

/**
 * Organizer / Admin: Revoke or Re-issue Certificate (FR-10.8)
 */
async function revokeCertificate(req, res) {
  try {
    const { id } = req.params;
    const { reason, action } = req.body; // action: 'REVOKE' or 'REINSTATE'

    const cert = await prisma.certificate.findUnique({
      where: { id },
      include: { user: true, event: true }
    });

    if (!cert) {
      return res.status(404).json({ error: 'Certificate not found.' });
    }

    const newStatus = action === 'REINSTATE' ? 'VALID' : 'REVOKED';

    const updated = await prisma.certificate.update({
      where: { id },
      data: {
        status: newStatus,
        revokeReason: newStatus === 'REVOKED' ? (reason || 'Revoked by institution authority') : null
      }
    });

    await logAuditEvent({
      actor: req.user,
      action: newStatus === 'REVOKED' ? 'CERTIFICATE_REVOKED' : 'CERTIFICATE_REINSTATED',
      entity: 'Certificate',
      entityId: id,
      oldValue: { status: cert.status },
      newValue: { status: newStatus, reason },
      req
    });

    // In-app notification
    await prisma.notification.create({
      data: {
        userId: cert.userId,
        title: newStatus === 'REVOKED' ? 'Certificate Revoked' : 'Certificate Reinstated',
        message: newStatus === 'REVOKED'
          ? `Your certificate for "${cert.eventTitle}" was revoked. Reason: ${reason || 'Administrative correction.'}`
          : `Your certificate for "${cert.eventTitle}" has been reinstated as valid.`,
        type: 'CERTIFICATE',
        link: '/dashboard/certificates'
      }
    });

    return res.json({
      message: `Certificate has been ${newStatus.toLowerCase()}.`,
      certificate: updated
    });
  } catch (err) {
    console.error('Revoke certificate error:', err);
    return res.status(500).json({ error: 'Failed to update certificate status.' });
  }
}

/**
 * Organizer / Admin: Create or Update Certificate Template (FR-10.1)
 */
async function upsertTemplate(req, res) {
  try {
    const { id, eventId, name, signatories, layoutConfig, backgroundUrl } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Template name is required.' });
    }

    let template;
    if (id) {
      template = await prisma.certificateTemplate.update({
        where: { id },
        data: {
          name,
          signatories: signatories || [],
          layoutConfig: layoutConfig || {},
          backgroundUrl: backgroundUrl || null
        }
      });
    } else {
      template = await prisma.certificateTemplate.create({
        data: {
          eventId: eventId || null,
          name,
          signatories: signatories || [],
          layoutConfig: layoutConfig || {},
          backgroundUrl: backgroundUrl || null
        }
      });
    }

    return res.status(200).json({ message: 'Template saved.', template });
  } catch (err) {
    console.error('Upsert template error:', err);
    return res.status(500).json({ error: 'Failed to save certificate template.' });
  }
}

module.exports = {
  getMyCertificates,
  verifyCertificate,
  downloadCertificatePdf,
  generateBulkCertificates,
  revokeCertificate,
  upsertTemplate
};

