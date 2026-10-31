const prisma = require('../config/prisma');
const { logAuditEvent } = require('../middleware/audit');

/**
 * Helper to check if a membership is currently valid & unexpired (FR-2.3, FR-2.4)
 */
function isMembershipActive(membership) {
  if (!membership) return false;
  if (membership.status !== 'VERIFIED') return false;
  const now = new Date();
  const expiry = new Date(membership.expiryDate);
  return expiry > now;
}

/**
 * Student: Submit IEEE Membership Details (FR-2.1, FR-2.5)
 */
async function submitMembership(req, res) {
  try {
    const { membershipNumber, grade, expiryDate } = req.body;

    if (!membershipNumber || !expiryDate) {
      return res.status(400).json({ error: 'Membership number and expiry date are required.' });
    }

    const cleanNum = membershipNumber.trim();
    const expiry = new Date(expiryDate);

    if (isNaN(expiry.getTime())) {
      return res.status(400).json({ error: 'Invalid expiry date format.' });
    }

    // FR-2.5: Prevent same IEEE number from being linked to more than one account
    const existingWithNum = await prisma.ieeeMembership.findFirst({
      where: {
        membershipNumber: cleanNum,
        userId: { not: req.user.id }
      }
    });

    if (existingWithNum) {
      return res.status(409).json({
        error: 'This IEEE membership number is already linked to another student account.'
      });
    }

    // Upsert membership for this user
    const membership = await prisma.ieeeMembership.upsert({
      where: { userId: req.user.id },
      update: {
        membershipNumber: cleanNum,
        grade: grade ? grade.trim() : 'Student Member',
        expiryDate: expiry,
        status: 'PENDING',
        rejectionReason: null
      },
      create: {
        userId: req.user.id,
        membershipNumber: cleanNum,
        grade: grade ? grade.trim() : 'Student Member',
        expiryDate: expiry,
        status: 'PENDING'
      }
    });

    // In-app notification
    await prisma.notification.create({
      data: {
        userId: req.user.id,
        title: 'IEEE Membership Submitted',
        message: `Your IEEE membership (${cleanNum}) was submitted and is pending verification by the branch coordinator.`,
        type: 'SYSTEM',
        link: '/dashboard/ieee'
      }
    });

    return res.status(200).json({
      message: 'IEEE membership submitted successfully for verification.',
      membership,
      isActive: isMembershipActive(membership)
    });
  } catch (err) {
    console.error('Submit IEEE membership error:', err);
    return res.status(500).json({ error: 'Failed to submit IEEE membership.' });
  }
}

/**
 * Student: Get My IEEE Membership
 */
async function getMyMembership(req, res) {
  try {
    const membership = await prisma.ieeeMembership.findUnique({
      where: { userId: req.user.id }
    });

    if (!membership) {
      return res.json({ membership: null, isActive: false });
    }

    return res.json({
      membership,
      isActive: isMembershipActive(membership)
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch membership.' });
  }
}

/**
 * Coordinator / Admin: List all IEEE Membership Submissions (FR-2.2)
 */
async function listMemberships(req, res) {
  try {
    const { status, search } = req.query;
    const where = {};

    if (status) where.status = status;
    if (search) {
      where.OR = [
        { membershipNumber: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { rollNo: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const memberships = await prisma.ieeeMembership.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, rollNo: true, department: true, year: true, phone: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const enriched = memberships.map((m) => ({
      ...m,
      isActive: isMembershipActive(m)
    }));

    return res.json({ memberships: enriched });
  } catch (err) {
    console.error('List memberships error:', err);
    return res.status(500).json({ error: 'Failed to list IEEE memberships.' });
  }
}

/**
 * Coordinator / Admin: Verify or Reject Membership (FR-2.2)
 */
async function reviewMembership(req, res) {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!['VERIFIED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Status must be VERIFIED or REJECTED.' });
    }

    const target = await prisma.ieeeMembership.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!target) {
      return res.status(404).json({ error: 'Membership application not found.' });
    }

    const updated = await prisma.ieeeMembership.update({
      where: { id },
      data: {
        status,
        verifiedById: req.user.id,
        rejectionReason: status === 'REJECTED' ? (rejectionReason || 'Details could not be verified') : null
      }
    });

    await logAuditEvent({
      actor: req.user,
      action: status === 'VERIFIED' ? 'IEEE_MEMBERSHIP_VERIFIED' : 'IEEE_MEMBERSHIP_REJECTED',
      entity: 'IeeeMembership',
      entityId: id,
      oldValue: { status: target.status },
      newValue: { status, rejectionReason },
      req
    });

    // In-app notification to the student
    await prisma.notification.create({
      data: {
        userId: target.userId,
        title: status === 'VERIFIED' ? 'IEEE Membership Verified! 🎉' : 'IEEE Membership Rejected',
        message: status === 'VERIFIED'
          ? `Your IEEE membership (${target.membershipNumber}) has been verified. You now enjoy discounted pricing on all IEEE events!`
          : `Your IEEE membership application was rejected: ${rejectionReason || 'Please verify details with your coordinator.'}`,
        type: 'SYSTEM',
        link: '/dashboard/ieee'
      }
    });

    return res.json({
      message: `Membership ${status.toLowerCase()} successfully.`,
      membership: updated,
      isActive: isMembershipActive(updated)
    });
  } catch (err) {
    console.error('Review membership error:', err);
    return res.status(500).json({ error: 'Failed to review membership.' });
  }
}

/**
 * Coordinator / Admin: Bulk Upload Verified Members via CSV (FR-2.6)
 * Accepts JSON array of { membershipNumber, email, grade, expiryDate } or raw CSV text
 */
async function bulkUploadMembers(req, res) {
  try {
    const { members } = req.body; // Expecting array of records

    if (!Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ error: 'Provide a non-empty array of member records.' });
    }

    const results = {
      total: members.length,
      successCount: 0,
      errors: []
    };

    for (const record of members) {
      const { membershipNumber, email, grade, expiryDate } = record;

      if (!membershipNumber || !email) {
        results.errors.push({ record, error: 'Missing membershipNumber or email.' });
        continue;
      }

      const user = await prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() }
      });

      if (!user) {
        results.errors.push({ record, error: `Student with email ${email} not registered in CEMS.` });
        continue;
      }

      const expiry = expiryDate ? new Date(expiryDate) : new Date(Date.now() + 365 * 24 * 3600 * 1000);

      try {
        await prisma.ieeeMembership.upsert({
          where: { userId: user.id },
          update: {
            membershipNumber: membershipNumber.trim(),
            grade: grade || 'Student Member',
            expiryDate: expiry,
            status: 'VERIFIED',
            verifiedById: req.user.id
          },
          create: {
            userId: user.id,
            membershipNumber: membershipNumber.trim(),
            grade: grade || 'Student Member',
            expiryDate: expiry,
            status: 'VERIFIED',
            verifiedById: req.user.id
          }
        });

        await prisma.notification.create({
          data: {
            userId: user.id,
            title: 'IEEE Membership Auto-Verified',
            message: `Your IEEE membership ${membershipNumber} has been verified via coordinator bulk upload.`,
            type: 'SYSTEM',
            link: '/dashboard/ieee'
          }
        });

        results.successCount++;
      } catch (err) {
        results.errors.push({ record, error: err.message });
      }
    }

    await logAuditEvent({
      actor: req.user,
      action: 'IEEE_BULK_UPLOAD',
      entity: 'IeeeMembership',
      newValue: { count: results.successCount, errors: results.errors.length },
      req
    });

    return res.json({
      message: `Bulk verification complete: ${results.successCount} verified, ${results.errors.length} skipped.`,
      results
    });
  } catch (err) {
    console.error('Bulk upload error:', err);
    return res.status(500).json({ error: 'Bulk upload failed.' });
  }
}

module.exports = {
  submitMembership,
  getMyMembership,
  listMemberships,
  reviewMembership,
  bulkUploadMembers,
  isMembershipActive
};

