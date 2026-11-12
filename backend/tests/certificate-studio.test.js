require('dotenv').config();
const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const prisma = require('../src/config/prisma');

test('Certificate Template Studio, Direct Issuance & Public Verification Suite', async (t) => {
  const uniqueSuffix = Date.now();
  const orgEmail = `test-org-${uniqueSuffix}@cems.edu`;
  const studentEmail = `test-recipient-${uniqueSuffix}@cems.edu`;
  let organizerUser;
  let studentUser;
  let organizerToken = '';
  let studentToken = '';
  let createdTemplateId = '';
  let issuedCertCode = '';
  let issuedCertUuid = '';

  t.after(async () => {
    // Cleanup temporary test data
    if (issuedCertUuid) {
      await prisma.certificate.deleteMany({ where: { id: issuedCertUuid } }).catch(() => {});
    }
    if (createdTemplateId) {
      await prisma.certificateTemplate.deleteMany({ where: { id: createdTemplateId } }).catch(() => {});
    }
    if (organizerUser) {
      await prisma.user.deleteMany({ where: { id: organizerUser.id } }).catch(() => {});
    }
    if (studentUser) {
      await prisma.user.deleteMany({ where: { id: studentUser.id } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  await t.test('1. Provision organizer & student accounts and login', async () => {
    const passwordHash = await bcrypt.hash('TestPass@123', 10);
    organizerUser = await prisma.user.create({
      data: {
        name: 'Test Organizer',
        email: orgEmail,
        passwordHash,
        role: 'ORGANIZER',
        isActive: true,
        isEmailVerified: true
      }
    });

    studentUser = await prisma.user.create({
      data: {
        name: 'Test Student Recipient',
        email: studentEmail,
        passwordHash,
        role: 'STUDENT',
        isActive: true,
        isEmailVerified: true
      }
    });

    const orgLogin = await request(app).post('/api/auth/login').send({
      email: orgEmail,
      password: 'TestPass@123'
    });
    assert.strictEqual(orgLogin.status, 200);
    organizerToken = orgLogin.body.token;

    const stuLogin = await request(app).post('/api/auth/login').send({
      email: studentEmail,
      password: 'TestPass@123'
    });
    assert.strictEqual(stuLogin.status, 200);
    studentToken = stuLogin.body.token;
  });

  await t.test('2. Create Konva visual Certificate Template', async () => {
    const editorData = {
      version: 1,
      width: 1200,
      height: 900,
      background: { type: 'color', value: '#ffffff' },
      elements: [
        {
          id: 'el-border',
          type: 'shape',
          x: 40,
          y: 40,
          width: 1120,
          height: 820,
          rotation: 0,
          opacity: 1,
          locked: true,
          zIndex: 1,
          properties: { shapeType: 'rect', fill: 'transparent', stroke: '#000000', strokeWidth: 4, cornerRadius: 0 }
        },
        {
          id: 'el-name',
          type: 'text',
          x: 100,
          y: 320,
          width: 1000,
          height: 60,
          rotation: 0,
          opacity: 1,
          locked: false,
          zIndex: 2,
          properties: {
            text: '{{recipientName}}',
            fontFamily: 'Georgia',
            fontSize: 44,
            fontStyle: 'bold',
            fill: '#000000',
            align: 'center',
            variable: 'recipientName'
          }
        },
        {
          id: 'el-qr',
          type: 'qrcode',
          x: 1000,
          y: 700,
          width: 110,
          height: 110,
          rotation: 0,
          opacity: 1,
          locked: false,
          zIndex: 3,
          properties: { value: '{{verificationUrl}}', variable: 'verificationUrl' }
        }
      ]
    };

    const res = await request(app)
      .post('/api/certificates/templates')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        name: `Konva Test Template ${uniqueSuffix}`,
        description: 'Automated test visual template',
        orientation: 'LANDSCAPE',
        editorData,
        schemaDefinition: [{ key: 'track', label: 'Track', type: 'text', required: false }]
      });

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.template?.id);
    assert.strictEqual(res.body.template.orientation, 'LANDSCAPE');
    assert.strictEqual(res.body.template.editorData.elements.length, 3);
    createdTemplateId = res.body.template.id;
  });

  await t.test('3. Issue direct certificate to recipient email and confirm delivery to My Certificates', async () => {
    const issueRes = await request(app)
      .post('/api/certificates/issue')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        templateId: createdTemplateId,
        eventTitle: 'AI Agents Bootcamp 2026',
        certificateType: 'WINNER',
        recipients: [
          {
            recipientName: 'Test Student Recipient',
            recipientEmail: studentEmail,
            credentialData: {
              track: 'Autonomous Systems',
              signatureUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
            }
          }
        ]
      });

    assert.strictEqual(issueRes.status, 201);
    assert.strictEqual(issueRes.body.issuedCount, 1);
    issuedCertCode = issueRes.body.certificates[0].certificateId;
    issuedCertUuid = issueRes.body.certificates[0].id;
    assert.strictEqual(issueRes.body.certificates[0].userId, studentUser.id);

    // Check respective student's My Certificates endpoint
    const myRes = await request(app)
      .get('/api/certificates/my')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.strictEqual(myRes.status, 200);
    const found = myRes.body.certificates.find((c) => c.certificateId === issuedCertCode);
    assert.ok(found, 'Issued certificate must appear in the respective recipient My Certificates page');
    assert.strictEqual(found.eventTitle, 'AI Agents Bootcamp 2026');
    assert.ok(found.template?.editorData, 'Certificate should include linked template editorData');
  });

  await t.test('4. Public verification & custom Konva PDF rendering', async () => {
    const verifyRes = await request(app).get(`/api/certificates/verify/${issuedCertCode}`);
    assert.strictEqual(verifyRes.status, 200);
    assert.strictEqual(verifyRes.body.isValid, true);
    assert.strictEqual(verifyRes.body.status, 'VALID');
    assert.strictEqual(verifyRes.body.certificate.recipientName, 'Test Student Recipient');
    assert.ok(verifyRes.body.certificate.contentHash, 'SHA-256 integrity hash must be present');
    assert.ok(verifyRes.body.certificate.template?.editorData, 'Verification response includes template editorData for live preview');

    // Download generated PDF rendered from Konva editorData
    const pdfRes = await request(app)
      .get(`/api/certificates/${issuedCertUuid}/download.pdf`)
      .buffer(true);

    assert.strictEqual(pdfRes.status, 200);
    assert.strictEqual(pdfRes.headers['content-type'], 'application/pdf');
    assert.ok(pdfRes.body.slice(0, 5).toString('utf8').startsWith('%PDF-'), 'Response must be a valid PDF binary');
  });
});
