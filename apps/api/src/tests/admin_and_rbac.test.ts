import { describe, it, expect, beforeEach } from 'vitest';
import { app, request, resetDatabase, createTestUser } from './helpers.js';
import { prisma } from '../lib/prisma.js';
import { generateAccessToken } from '../lib/security.js';

describe('Admin Portal and Role-Based Access Control (RBAC)', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  async function createAdminUser(email = 'admin@example.com', password = 'Password123!') {
    const { user } = await createTestUser(email, password);
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { role: 'admin' },
    });
    const accessToken = await generateAccessToken(user.id, 'admin');
    return { ...user, role: updated.role, accessToken };
  }

  describe('Login Role Selection & Enforcement', () => {
    it('USER selecting User login succeeds and receives user role', async () => {
      await createTestUser('normaluser@example.com', 'Password123!');

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'normaluser@example.com',
          password: 'Password123!',
          selectedRole: 'user',
        });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('user');
      expect(typeof res.body.accessToken).toBe('string');
    });

    it('USER selecting Admin login is rejected with HTTP 403 and specific message', async () => {
      await createTestUser('normaluser@example.com', 'Password123!');

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'normaluser@example.com',
          password: 'Password123!',
          selectedRole: 'admin',
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toHaveProperty('message');
      expect(res.body.error.message).toBe(
        'You selected Admin Login, but this account is not registered as an administrator.',
      );
    });

    it('ADMIN selecting Admin login succeeds and receives admin role', async () => {
      await createAdminUser('adminuser@example.com', 'Password123!');

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'adminuser@example.com',
          password: 'Password123!',
          selectedRole: 'admin',
        });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('admin');
      expect(typeof res.body.accessToken).toBe('string');
    });

    it('ADMIN selecting User login is allowed to login in both roles with HTTP 200', async () => {
      await createAdminUser('adminuser@example.com', 'Password123!');

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'adminuser@example.com',
          password: 'Password123!',
          selectedRole: 'user',
        });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('admin');
      expect(typeof res.body.accessToken).toBe('string');
    });

    it('Invalid password returns generic 401 UNAUTHENTICATED even with role selection', async () => {
      await createTestUser('user@example.com', 'Password123!');

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'user@example.com',
          password: 'WrongPassword!',
          selectedRole: 'user',
        });

      expect(res.status).toBe(401);
    });
  });

  describe('Admin API Authorization and Protection', () => {
    it('Unauthenticated request to /admin/overview returns 401', async () => {
      const res = await request(app).get('/api/v1/admin/overview');
      expect(res.status).toBe(401);
    });

    it('Normal user request to /admin/overview returns 403 Forbidden', async () => {
      const { user } = await createTestUser('user@example.com', 'Password123!');
      const userAccessToken = await generateAccessToken(user.id, 'user');

      const res = await request(app)
        .get('/api/v1/admin/overview')
        .set('Authorization', `Bearer ${userAccessToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/administrator privileges required/i);
    });

    it('Admin user request to /admin/overview returns 200 with system KPIs and health', async () => {
      const admin = await createAdminUser('admin@example.com', 'Password123!');

      const res = await request(app)
        .get('/api/v1/admin/overview')
        .set('Authorization', `Bearer ${admin.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('metrics');
      expect(res.body.metrics).toHaveProperty('totalUsers');
      expect(res.body.metrics).toHaveProperty('totalAdmins');
      expect(res.body).toHaveProperty('health');
      expect(res.body.health.database.status).toBe('up');
      expect(res.body).toHaveProperty('categoryDistribution');
    });

    it('Admin can list users and search by email or name', async () => {
      const admin = await createAdminUser('admin@example.com', 'Password123!');
      await createTestUser('alice@example.com', 'Password123!');
      await createTestUser('bob@example.com', 'Password123!');

      const res = await request(app)
        .get('/api/v1/admin/users?search=alice')
        .set('Authorization', `Bearer ${admin.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.users).toHaveLength(1);
      expect(res.body.users[0].email).toBe('alice@example.com');
    });

    it('Admin can update another user role to admin', async () => {
      const admin = await createAdminUser('admin@example.com', 'Password123!');
      const { user: targetUser } = await createTestUser('target@example.com', 'Password123!');

      const res = await request(app)
        .patch(`/api/v1/admin/users/${targetUser.id}/role`)
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .send({ role: 'admin' });

      expect(res.status).toBe(200);
      expect(res.body.role).toBe('admin');

      // Verify in database
      const check = await prisma.user.findUnique({ where: { id: targetUser.id } });
      expect(check?.role).toBe('admin');
    });

    it('Admin cannot demote their own account', async () => {
      const admin = await createAdminUser('admin@example.com', 'Password123!');

      const res = await request(app)
        .patch(`/api/v1/admin/users/${admin.id}/role`)
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .send({ role: 'user' });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/cannot demote your own administrator account/i);
    });

    it('Admin can manage category classification rules (CRUD)', async () => {
      const admin = await createAdminUser('admin@example.com', 'Password123!');

      // Create
      const createRes = await request(app)
        .post('/api/v1/admin/categories')
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .send({
          kind: 'domain',
          pattern: 'customdomain.org',
          category: 'productive',
        });

      expect(createRes.status).toBe(201);
      const categoryId = createRes.body.id;

      // Read
      const listRes = await request(app)
        .get('/api/v1/admin/categories')
        .set('Authorization', `Bearer ${admin.accessToken}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.some((c: any) => c.pattern === 'customdomain.org')).toBe(true);

      // Update
      const updateRes = await request(app)
        .patch(`/api/v1/admin/categories/${categoryId}`)
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .send({
          category: 'other',
        });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.category).toBe('other');

      // Delete
      const deleteRes = await request(app)
        .delete(`/api/v1/admin/categories/${categoryId}`)
        .set('Authorization', `Bearer ${admin.accessToken}`);
      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);
    });

    it('Admin can inspect audit logs and telemetry feed', async () => {
      const admin = await createAdminUser('admin@example.com', 'Password123!');

      const res = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${admin.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('insights');
      expect(res.body).toHaveProperty('alerts');
      expect(res.body).toHaveProperty('recommendations');
    });
  });
});
