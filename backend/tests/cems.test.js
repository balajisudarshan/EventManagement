const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/prisma');

test('CEMS API Test Suite', async (t) => {
  let studentToken = '';
  let adminToken = '';
  let organizerToken = '';
  let ieeeStudentToken = '';
  let publishedIeeeEvent = null;
  let generalEvent = null;

  await t.test('1. Health Check Endpoint', async () => {
    const res = await request(app).get('/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
    assert.ok(res.body.system.includes('CEMS'));
  });

  await t.test('2. Authentication & Role Retrieval', async () => {
    // Student Login
    const studentRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'student@cems.edu', password: 'Student@123' });

    assert.strictEqual(studentRes.status, 200);
    assert.ok(studentRes.body.token);
    assert.strictEqual(studentRes.body.user.role, 'STUDENT');
    studentToken = studentRes.body.token;

    // IEEE Student Login
    const ieeeRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ieee.student@cems.edu', password: 'Student@123' });

    assert.strictEqual(ieeeRes.status, 200);
    assert.ok(ieeeRes.body.token);
    assert.strictEqual(ieeeRes.body.user.ieeeMembership?.status, 'VERIFIED');
    ieeeStudentToken = ieeeRes.body.token;

    // Admin Login
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@cems.edu', password: 'Admin@123' });

    assert.strictEqual(adminRes.status, 200);
    assert.strictEqual(adminRes.body.user.role, 'ADMIN');
    adminToken = adminRes.body.token;

    // Organizer Login
    const orgRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'organizer@cems.edu', password: 'Organizer@123' });

    assert.strictEqual(orgRes.status, 200);
    assert.strictEqual(orgRes.body.user.role, 'ORGANIZER');
    organizerToken = orgRes.body.token;
  });

  await t.test('3. Organizing Bodies Listing', async () => {
    const res = await request(app).get('/api/bodies');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.bodies));
    assert.ok(res.body.bodies.length >= 2);

    const ieeeBody = res.body.bodies.find((b) => b.type === 'IEEE');
    assert.ok(ieeeBody, 'IEEE organizing body should exist');
  });

  await t.test('4. IEEE Discount Fee Calculation (BR-3, BR-4, BR-5)', async () => {
    const eventsRes = await request(app).get('/api/events');
    assert.strictEqual(eventsRes.status, 200);
    const events = eventsRes.body.events;

    publishedIeeeEvent = events.find((e) => e.organizingBody?.type === 'IEEE' && e.standardFee > 0);
    assert.ok(publishedIeeeEvent, 'Should find published paid IEEE event');

    generalEvent = events.find((e) => e.organizingBody?.type === 'GENERAL' && e.standardFee > 0);
    assert.ok(generalEvent, 'Should find published paid General event');

    // As Verified IEEE Student: should receive IEEE fee
    const ieeeEventRes = await request(app)
      .get(`/api/events/${publishedIeeeEvent.id}`)
      .set('Authorization', `Bearer ${ieeeStudentToken}`);

    assert.strictEqual(ieeeEventRes.status, 200);
    assert.strictEqual(ieeeEventRes.body.event.applicableFeeInfo.feeType, 'IEEE');
    assert.strictEqual(ieeeEventRes.body.event.applicableFeeInfo.applicableFee, publishedIeeeEvent.ieeeFee);
    assert.strictEqual(ieeeEventRes.body.event.applicableFeeInfo.isDiscounted, true);

    // As Non-IEEE Student: should receive standard fee
    const stdEventRes = await request(app)
      .get(`/api/events/${publishedIeeeEvent.id}`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.strictEqual(stdEventRes.status, 200);
    assert.strictEqual(stdEventRes.body.event.applicableFeeInfo.feeType, 'STANDARD');
    assert.strictEqual(stdEventRes.body.event.applicableFeeInfo.applicableFee, publishedIeeeEvent.standardFee);
    assert.strictEqual(stdEventRes.body.event.applicableFeeInfo.isDiscounted, false);

    // On General event: IEEE student should pay standard fee (BR-5)
    if (generalEvent) {
      const genEventRes = await request(app)
        .get(`/api/events/${generalEvent.id}`)
        .set('Authorization', `Bearer ${ieeeStudentToken}`);

      assert.strictEqual(genEventRes.status, 200);
      assert.strictEqual(genEventRes.body.event.applicableFeeInfo.feeType, 'STANDARD');
      assert.strictEqual(genEventRes.body.event.applicableFeeInfo.applicableFee, generalEvent.standardFee);
    }
  });

  await t.test('5. Event Fee Validation Rejection (FR-7.1)', async () => {
    // Attempting to create an IEEE event where ieeeFee >= standardFee should be rejected
    const bodiesRes = await request(app).get('/api/bodies?type=IEEE');
    const ieeeBody = bodiesRes.body.bodies[0];

    const invalidEventRes = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        organizingBodyId: ieeeBody.id,
        title: 'Invalid IEEE Fee Test Event',
        description: 'Testing validation rejection',
        startDateTime: new Date(Date.now() + 86400000).toISOString(),
        endDateTime: new Date(Date.now() + 172800000).toISOString(),
        registrationDeadline: new Date(Date.now() + 80000000).toISOString(),
        seatLimit: 50,
        isFree: false,
        standardFee: 200,
        ieeeFee: 250 // INVALID: greater than standard fee
      });

    assert.strictEqual(invalidEventRes.status, 400);
    assert.ok(invalidEventRes.body.error.includes('strictly lower than the standard fee'));
  });

  await t.test('6. Atomic Event Registration & Ticket QR Code Generation (FR-6.1, FR-6.8)', async () => {
    // Find an event where student is not yet registered
    const eventsRes = await request(app).get('/api/events');
    const testEvent = eventsRes.body.events.find((e) => e.status === 'PUBLISHED' && e.title.includes('AI & GenAI'));
    assert.ok(testEvent, 'Target test event found');

    const regRes = await request(app)
      .post(`/api/registrations/events/${testEvent.id}/register`)
      .set('Authorization', `Bearer ${ieeeStudentToken}`)
      .send({
        customAnswers: { teamName: 'NeuroCoders', projectTrack: 'Agentic AI' }
      });

    assert.strictEqual(regRes.status, 201);
    assert.strictEqual(regRes.body.status, 'CONFIRMED');
    assert.ok(regRes.body.registration.ticketCode);
    assert.ok(regRes.body.registration.qrCode.startsWith('data:image/png;base64'));

    // Duplicate registration prevention (FR-6.5)
    const dupRes = await request(app)
      .post(`/api/registrations/events/${testEvent.id}/register`)
      .set('Authorization', `Bearer ${ieeeStudentToken}`)
      .send({});

    assert.strictEqual(dupRes.status, 400);
    assert.ok(dupRes.body.error.includes('already registered'));
  });

  await t.test('7. Attendance Marking & Duplicate Scan Detection (FR-9.1, FR-9.4)', async () => {
    // Find registration
    const myRegs = await request(app)
      .get('/api/registrations/my')
      .set('Authorization', `Bearer ${ieeeStudentToken}`);

    assert.strictEqual(myRegs.status, 200);
    const reg = myRegs.body.registrations[0];
    assert.ok(reg, 'Registration exists');

    // First scan: should succeed
    const scanRes = await request(app)
      .post(`/api/attendance/events/${reg.eventId}/scan`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        qrPayload: `CEMS:${reg.ticketCode}:${reg.eventId}:${reg.userId}`
      });

    assert.ok([200, 201].includes(scanRes.status));

    // Second scan with same QR code: should detect duplicate (FR-9.4)
    const dupScanRes = await request(app)
      .post(`/api/attendance/events/${reg.eventId}/scan`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        qrPayload: `CEMS:${reg.ticketCode}:${reg.eventId}:${reg.userId}`
      });

    assert.strictEqual(dupScanRes.status, 200);
    assert.strictEqual(dupScanRes.body.status, 'DUPLICATE');
    assert.strictEqual(dupScanRes.body.alreadyMarked, true);
  });

  await t.test('8. Public Certificate Verification (FR-10.7, FR-10.8)', async () => {
    // Verify pre-seeded valid certificate CERT-CEMS-ROBO-948102
    const verifyRes = await request(app).get('/api/certificates/verify/CERT-CEMS-ROBO-948102');
    assert.strictEqual(verifyRes.status, 200);
    assert.strictEqual(verifyRes.body.isValid, true);
    assert.strictEqual(verifyRes.body.status, 'VALID');
    assert.strictEqual(verifyRes.body.certificate.recipientName, 'Rohan Sharma (IEEE Member)');

    // Non-existent certificate
    const invalidRes = await request(app).get('/api/certificates/verify/CERT-FAKE-999999');
    assert.strictEqual(invalidRes.status, 404);
    assert.strictEqual(invalidRes.body.isValid, false);
  });

  await t.test('9. Admin Institution-Wide Analytics & Audit Log (FR-12.3, FR-12.4)', async () => {
    const analyticsRes = await request(app)
      .get('/api/reports/admin/analytics')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(analyticsRes.status, 200);
    assert.ok(analyticsRes.body.metrics.totalUsers > 0);
    assert.ok(analyticsRes.body.metrics.totalEvents > 0);

    const auditRes = await request(app)
      .get('/api/reports/admin/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(auditRes.status, 200);
    assert.ok(Array.isArray(auditRes.body.logs));
    assert.ok(auditRes.body.logs.length > 0);
  });

  await t.test('10. In-App Notifications (FR-11.3)', async () => {
    const notifRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${ieeeStudentToken}`);

    assert.strictEqual(notifRes.status, 200);
    assert.ok(Array.isArray(notifRes.body.notifications));
    assert.ok(typeof notifRes.body.unreadCount === 'number');
  });
});

