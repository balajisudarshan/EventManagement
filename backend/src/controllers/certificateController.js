const crypto = require('crypto');
const prisma = require('../config/prisma');
const { generateCertificatePdf } = require('../utils/pdf');
const { generateQrDataUrl } = require('../utils/qr');
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

function normalizeOrigin(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    return parsed.origin;
  } catch {
    return null;
  }
}

function isLocalOrigin(origin) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin || '');
}

/**
 * Resolve the public frontend origin for QR verification links.
 * Prefers live non-localhost browser origin headers over localhost fallbacks.
 */
function resolveClientUrl(req) {
  const candidates = [
    normalizeOrigin(req?.get?.('x-client-origin')),
    normalizeOrigin(req?.query?.clientOrigin),
    normalizeOrigin(req?.get?.('origin')),
    normalizeOrigin(req?.get?.('referer')),
    normalizeOrigin(process.env.CLIENT_URL),
    'http://localhost:3000'
  ].filter(Boolean);

  const liveOrigin = candidates.find((c) => !isLocalOrigin(c));
  return liveOrigin || candidates[0];
}

/**
 * Compute SHA-256 content hash for certificate integrity verification
 */
function computeContentHash({ certificateId, templateId, recipientName, recipientEmail, eventTitle, credentialData, issueDate }) {
  const payload = JSON.stringify({
    certificateId,
    templateId: templateId || null,
    recipientName,
    recipientEmail: recipientEmail || null,
    eventTitle,
    credentialData: credentialData || {},
    issueDate: issueDate instanceof Date ? issueDate.toISOString() : issueDate
  });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Student: Get My Certificates (FR-10.5)
 * Matches either userId OR recipientEmail (so direct certificates issued by email always appear)
 */
async function getMyCertificates(req, res) {
  try {
    const userEmail = req.user.email;

    // Auto-link any certificates issued to this user's email before they had userId linked
    if (userEmail) {
      await prisma.certificate.updateMany({
        where: {
          userId: null,
          recipientEmail: { equals: userEmail, mode: 'insensitive' }
        },
        data: { userId: req.user.id }
      });
    }

    const certificates = await prisma.certificate.findMany({
      where: {
        OR: [
          { userId: req.user.id },
          ...(userEmail ? [{ recipientEmail: { equals: userEmail, mode: 'insensitive' } }] : [])
        ]
      },
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
          select: { id: true, name: true, email: true, rollNo: true, department: true }
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

    const isExpired = cert.expiresAt && new Date(cert.expiresAt) < new Date();
    const isValid = cert.status === 'VALID' && !isExpired;
    const effectiveStatus = isExpired && cert.status === 'VALID' ? 'EXPIRED' : cert.status;

    return res.json({
      isValid,
      status: effectiveStatus,
      certificate: {
        id: cert.id,
        certificateId: cert.certificateId,
        recipientName: cert.recipientName,
        recipientEmail: cert.recipientEmail || cert.user?.email || null,
        recipientRollNo: cert.user?.rollNo || null,
        eventTitle: cert.eventTitle,
        category: cert.event?.category || 'Credential',
        organizingBody: cert.event?.organizingBody?.name || 'College Chapter / CEMS',
        bodyType: cert.event?.organizingBody?.type || null,
        issueDate: cert.issueDate,
        expiresAt: cert.expiresAt,
        type: cert.type,
        status: effectiveStatus,
        revokeReason: cert.status === 'REVOKED' ? cert.revokeReason : null,
        pdfUrl: cert.pdfUrl,
        contentHash: cert.contentHash,
        credentialData: cert.credentialData || {},
        qrCode: cert.qrCode,
        template: cert.template ? {
          id: cert.template.id,
          name: cert.template.name,
          orientation: cert.template.orientation,
          editorData: cert.template.editorData,
          schemaDefinition: cert.template.schemaDefinition
        } : null
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
    const { id } = req.params;

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

    const clientUrl = resolveClientUrl(req);
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
    const { templateId, certificateType, overrideAttendanceCheck, credentialData } = req.body;

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

    const clientUrl = resolveClientUrl(req);
    const effectiveTemplateId = templateId || event.certificateTemplates[0]?.id || null;

    let generatedCount = 0;
    const newlyCreated = [];

    for (const reg of eligibleRegistrations) {
      if (reg.certificate) {
        continue;
      }

      const certCode = generateCertId();
      const publicVerifyUrl = `${clientUrl}/verify-certificate/${certCode}`;
      const qrCodeUrl = await generateQrDataUrl(publicVerifyUrl);
      const issueDate = new Date();
      const mergedCredentialData = {
        courseTitle: event.title,
        eventTitle: event.title,
        department: reg.user.department || '',
        rollNo: reg.user.rollNo || '',
        ...(credentialData && typeof credentialData === 'object' ? credentialData : {})
      };

      const contentHash = computeContentHash({
        certificateId: certCode,
        templateId: effectiveTemplateId,
        recipientName: reg.user.name,
        recipientEmail: reg.user.email.toLowerCase(),
        eventTitle: event.title,
        credentialData: mergedCredentialData,
        issueDate
      });

      const cert = await prisma.certificate.create({
        data: {
          certificateId: certCode,
          registrationId: reg.id,
          eventId,
          userId: reg.userId,
          recipientName: reg.user.name,
          recipientEmail: reg.user.email.toLowerCase(),
          eventTitle: event.title,
          credentialData: mergedCredentialData,
          contentHash,
          issueDate,
          type: certificateType || 'PARTICIPATION',
          templateId: effectiveTemplateId,
          status: 'VALID',
          qrCode: qrCodeUrl
        }
      });

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
      newValue: { count: generatedCount, type: certificateType || 'PARTICIPATION', templateId: effectiveTemplateId },
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
 * Organizer / Admin: Issue Direct or Batch Template-based Certificates
 * Links automatically to recipient's User account by email or userId so it appears on their My Certificates page!
 */
async function issueCertificates(req, res) {
  try {
    const { templateId, eventId, certificateType, eventTitle, recipients } = req.body;

    if (!templateId) {
      return res.status(400).json({ error: 'Please select a certificate template.' });
    }

    const template = await prisma.certificateTemplate.findUnique({
      where: { id: templateId }
    });

    if (!template) {
      return res.status(404).json({ error: 'Selected template not found.' });
    }

    let linkedEvent = null;
    if (eventId) {
      linkedEvent = await prisma.event.findUnique({ where: { id: eventId } });
    }

    const recipientList = Array.isArray(recipients) && recipients.length > 0
      ? recipients
      : (req.body.recipientName ? [req.body] : []);

    if (recipientList.length === 0) {
      return res.status(400).json({ error: 'At least one recipient is required.' });
    }

    const clientUrl = resolveClientUrl(req);
    const issued = [];
    const errors = [];

    for (let i = 0; i < recipientList.length; i++) {
      const item = recipientList[i];
      const name = item.recipientName?.trim();
      const email = item.recipientEmail?.trim()?.toLowerCase() || null;

      if (!name) {
        errors.push(`Row ${i + 1}: Recipient name is required.`);
        continue;
      }

      // Match registered User account by userId or email
      let matchedUser = null;
      if (item.userId) {
        matchedUser = await prisma.user.findUnique({ where: { id: item.userId } });
      } else if (email) {
        matchedUser = await prisma.user.findFirst({
          where: { email: { equals: email, mode: 'insensitive' } }
        });
      }

      const certCode = generateCertId();
      const publicVerifyUrl = `${clientUrl}/verify-certificate/${certCode}`;
      const qrCodeUrl = await generateQrDataUrl(publicVerifyUrl);
      const issueDate = new Date();
      const effectiveTitle = (item.eventTitle || eventTitle || linkedEvent?.title || template.name || 'Certificate').trim();
      const credData = {
        courseTitle: effectiveTitle,
        eventTitle: effectiveTitle,
        ...(item.credentialData && typeof item.credentialData === 'object' ? item.credentialData : {})
      };

      const contentHash = computeContentHash({
        certificateId: certCode,
        templateId: template.id,
        recipientName: name,
        recipientEmail: email || matchedUser?.email?.toLowerCase() || null,
        eventTitle: effectiveTitle,
        credentialData: credData,
        issueDate
      });

      const cert = await prisma.certificate.create({
        data: {
          certificateId: certCode,
          eventId: linkedEvent?.id || null,
          userId: matchedUser?.id || null,
          recipientName: name,
          recipientEmail: email || matchedUser?.email?.toLowerCase() || null,
          eventTitle: effectiveTitle,
          credentialData: credData,
          contentHash,
          issueDate,
          expiresAt: item.expiresAt ? new Date(item.expiresAt) : null,
          type: item.type || certificateType || 'PARTICIPATION',
          templateId: template.id,
          status: 'VALID',
          qrCode: qrCodeUrl
        },
        include: {
          template: { select: { id: true, name: true } },
          user: { select: { id: true, name: true, email: true } }
        }
      });

      // Notify recipient if they have an account
      if (matchedUser) {
        await prisma.notification.create({
          data: {
            userId: matchedUser.id,
            title: `Certificate Issued: ${effectiveTitle}`,
            message: `A new verifiable certificate (${certCode}) has been issued to you and added to your Certificates page.`,
            type: 'CERTIFICATE',
            link: '/dashboard/certificates'
          }
        });
      }

      issued.push(cert);
    }

    if (issued.length === 0) {
      return res.status(400).json({ error: errors[0] || 'No valid recipients to issue.' });
    }

    await logAuditEvent({
      actor: req.user,
      action: 'CERTIFICATES_DIRECT_ISSUED',
      entity: 'Certificate',
      entityId: template.id,
      newValue: { count: issued.length, templateName: template.name },
      req
    });

    return res.status(201).json({
      message: `Issued ${issued.length} certificate${issued.length === 1 ? '' : 's'} successfully.`,
      issuedCount: issued.length,
      errors,
      certificates: issued
    });
  } catch (err) {
    console.error('Issue certificates error:', err);
    return res.status(500).json({ error: 'Failed to issue certificates.' });
  }
}

/**
 * Organizer / Admin: List all issued certificates (with optional filters)
 */
async function listIssuedCertificates(req, res) {
  try {
    const { eventId, templateId, status, search } = req.query;
    const where = {};

    if (eventId) where.eventId = eventId;
    if (templateId) where.templateId = templateId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { certificateId: { contains: search, mode: 'insensitive' } },
        { recipientName: { contains: search, mode: 'insensitive' } },
        { recipientEmail: { contains: search, mode: 'insensitive' } },
        { eventTitle: { contains: search, mode: 'insensitive' } }
      ];
    }

    const certificates = await prisma.certificate.findMany({
      where,
      include: {
        template: { select: { id: true, name: true, orientation: true, editorData: true } },
        event: { select: { id: true, title: true } },
        user: { select: { id: true, name: true, email: true, rollNo: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 200
    });

    return res.json({ certificates });
  } catch (err) {
    console.error('List issued certificates error:', err);
    return res.status(500).json({ error: 'Failed to list issued certificates.' });
  }
}

/**
 * Organizer / Admin: Search registered users to pick as certificate recipients
 */
async function searchRecipients(req, res) {
  try {
    const { q = '' } = req.query;
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        ...(q.trim() ? {
          OR: [
            { name: { contains: q.trim(), mode: 'insensitive' } },
            { email: { contains: q.trim(), mode: 'insensitive' } },
            { rollNo: { contains: q.trim(), mode: 'insensitive' } }
          ]
        } : {})
      },
      select: {
        id: true,
        name: true,
        email: true,
        rollNo: true,
        department: true,
        role: true
      },
      orderBy: { name: 'asc' },
      take: 25
    });
    return res.json({ users });
  } catch (err) {
    console.error('Search recipients error:', err);
    return res.status(500).json({ error: 'Failed to search users.' });
  }
}

/**
 * Organizer / Admin: Revoke or Re-issue Certificate (FR-10.8)
 */
async function revokeCertificate(req, res) {
  try {
    const { id } = req.params;
    const { reason, action } = req.body;

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

    if (cert.userId) {
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
    }

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
 * Organizer / Admin: List Certificate Templates
 */
async function listTemplates(req, res) {
  try {
    const { eventId } = req.query;
    const where = {};
    if (eventId) where.eventId = eventId;

    const templates = await prisma.certificateTemplate.findMany({
      where,
      include: {
        event: { select: { id: true, title: true } },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { certificates: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return res.json({ templates });
  } catch (err) {
    console.error('List templates error:', err);
    return res.status(500).json({ error: 'Failed to fetch certificate templates.' });
  }
}

/**
 * Organizer / Admin: Get Single Certificate Template by ID
 */
async function getTemplateById(req, res) {
  try {
    const { id } = req.params;
    const template = await prisma.certificateTemplate.findUnique({
      where: { id },
      include: {
        event: { select: { id: true, title: true } },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { certificates: true } }
      }
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found.' });
    }

    return res.json({ template });
  } catch (err) {
    console.error('Get template error:', err);
    return res.status(500).json({ error: 'Failed to fetch template.' });
  }
}

/**
 * Organizer / Admin: Create or Update Certificate Template (FR-10.1 + Visual Konva Editor)
 */
async function upsertTemplate(req, res) {
  try {
    const {
      id,
      eventId,
      name,
      description,
      orientation,
      thumbnailUrl,
      editorData,
      schemaDefinition,
      signatories,
      layoutConfig,
      backgroundUrl,
      isPublished
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Template name is required.' });
    }

    const payload = {
      name: name.trim(),
      description: description || null,
      orientation: orientation === 'PORTRAIT' ? 'PORTRAIT' : 'LANDSCAPE',
      thumbnailUrl: thumbnailUrl !== undefined ? thumbnailUrl : undefined,
      editorData: editorData !== undefined ? editorData : undefined,
      schemaDefinition: schemaDefinition !== undefined ? schemaDefinition : [],
      signatories: signatories || [],
      layoutConfig: layoutConfig || {},
      backgroundUrl: backgroundUrl || null,
      eventId: eventId || null,
      isPublished: isPublished !== undefined ? Boolean(isPublished) : true
    };

    let template;
    if (id) {
      template = await prisma.certificateTemplate.update({
        where: { id },
        data: payload
      });
    } else {
      template = await prisma.certificateTemplate.create({
        data: {
          ...payload,
          createdById: req.user?.id || null
        }
      });
    }

    return res.status(200).json({ message: 'Template saved successfully.', template });
  } catch (err) {
    console.error('Upsert template error:', err);
    return res.status(500).json({ error: 'Failed to save certificate template.' });
  }
}

/**
 * Organizer / Admin: Delete Certificate Template
 */
async function deleteTemplate(req, res) {
  try {
    const { id } = req.params;
    const existing = await prisma.certificateTemplate.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Template not found.' });
    }

    await prisma.certificateTemplate.delete({ where: { id } });
    return res.json({ message: 'Template deleted.' });
  } catch (err) {
    console.error('Delete template error:', err);
    return res.status(500).json({ error: 'Failed to delete template.' });
  }
}

module.exports = {
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
};
