require('dotenv').config();
const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const prisma = require('../src/config/prisma');

test('Admin User Promotion & IEEE Tier Governance Suite', async (t) => {
  const uniqueSuffix = Date.now();
  const adminEmail = `promo-admin-${uniqueSuffix}@cems.edu`;
  const userEmail = `promo-student-${uniqueSuffix}@cems.edu`;
  let adminUser;
  let targetUser;
  let adminToken = '';
  let studentToken = '';

  t.after(async () => {
    if (targetUser) {
      await prisma.ieeeMembership.deleteMany({ where: { userId: targetUser.id } }).catch(() => {});
      await prisma.notification.deleteMany({ where: { userId: targetUser.id } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: targetUser.id } }).catch(() => {});
    }
    if (adminUser) {
      await prisma.user.deleteMany({ where: { id: adminUser.id } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  await t.test('1. Provision Admin & Normal Student users', async () => {
    const passwordHash = await bcrypt.hash('TestPass@123', 10);
    adminUser = await prisma.user.create({
      data: {
        name: 'Promo Test Admin',
        email: adminEmail,
        passwordHash,
        role: 'ADMIN',
        isActive: true,
        isEmailVerified: true
      }
    });

    targetUser = await prisma.user.create({
      data: {
        name: 'Normal Test Student',
        email: userEmail,
        passwordHash,
        role: 'STUDENT',
        isActive: true,
        isEmailVerified: true
      }
    });

    const aRes = await request(app).post('/api/auth/login').send({ email: adminEmail, password: 'TestPass@123' });
    assert.strictEqual(aRes.status, 200);
    adminToken = aRes.body.token;

    const sRes = await request(app).post('/api/auth/login').send({ email: userEmail, password: 'TestPass@123' });
    assert.strictEqual(sRes.status, 200);
    studentToken = sRes.body.token;
  });

  await t.test('2. Non-admin cannot promote users (RBAC)', async () => {
    const res = await request(app)
      .post(`/api/auth/users/${targetUser.id}/promote`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ role: 'ADMIN' });

    assert.strictEqual(res.status, 403);
  });

  await t.test('3. Admin promotes Normal User -> Verified IEEE Member', async () => {
    const res = await request(app)
      .post(`/api/auth/users/${targetUser.id}/promote`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ieeeStatus: 'VERIFIED' });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.user.role, 'STUDENT');
    assert.strictEqual(res.body.user.ieeeMembership?.status, 'VERIFIED');
    assert.ok(res.body.user.ieeeMembership?.membershipNumber);
  });

  await t.test('4. Admin promotes IEEE Member -> Admin', async () => {
    const res = await request(app)
      .post(`/api/auth/users/${targetUser.id}/promote`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'ADMIN', ieeeStatus: 'VERIFIED' });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.user.role, 'ADMIN');
    assert.strictEqual(res.body.user.ieeeMembership?.status, 'VERIFIED');
  });

  await t.test('5. Admin reverts user back to Normal Student (Non-IEEE)', async () => {
    const res = await request(app)
      .post(`/api/auth/users/${targetUser.id}/promote`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'STUDENT', ieeeStatus: 'NONE' });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.user.role, 'STUDENT');
    assert.strictEqual(res.body.user.ieeeMembership, null);
  });
});

