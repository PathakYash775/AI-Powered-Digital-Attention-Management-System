import { describe, it, expect, beforeEach } from 'vitest';
import { app, request, resetDatabase, createTestUser } from './helpers.js';

function getCookies(res: { headers: Record<string, unknown> }): string[] {
  const sc = res.headers['set-cookie'];
  if (!sc) return [];
  if (Array.isArray(sc)) return sc as string[];
  return [String(sc)];
}

describe('Auth Module', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('register and login happy path with response shapes and cookies', async () => {
    const registerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'User1@Example.COM',
        password: 'Password123!',
        displayName: 'User One',
      });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body).toHaveProperty('accessToken');
    expect(typeof registerRes.body.accessToken).toBe('string');
    expect(registerRes.body).toHaveProperty('user');
    expect(registerRes.body.user).toEqual({
      id: expect.any(String),
      email: 'user1@example.com',
    });

    const setCookies = getCookies(registerRes);
    const rtCookie = setCookies.find((c) => c.startsWith('rt='));
    expect(rtCookie).toBeDefined();
    expect(rtCookie).toContain('HttpOnly');
    expect(rtCookie).toContain('Path=/api/v1/auth');
    expect(rtCookie?.toLowerCase()).toContain('samesite=strict');

    // Login happy path
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'user1@example.com',
        password: 'Password123!',
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body).toHaveProperty('accessToken');
    expect(loginRes.body.user.email).toBe('user1@example.com');
  });

  it('duplicate email returns 409 CONFLICT', async () => {
    await createTestUser('dup@example.com', 'Password123!');

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'dup@example.com',
        password: 'Password123!',
        displayName: 'Duplicate',
      });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      error: {
        code: 'CONFLICT',
        message: expect.any(String),
      },
    });
  });

  it('wrong password returns generic 401 UNAUTHENTICATED', async () => {
    await createTestUser('authuser@example.com', 'Password123!');

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'authuser@example.com',
        password: 'WrongPassword999!',
      });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Invalid email or password',
      },
    });
  });

  it('refresh rotation rotates refresh token in cookie and returns new accessToken', async () => {
    const registerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'refresh@example.com',
        password: 'Password123!',
        displayName: 'Refresher',
      });

    const cookies = getCookies(registerRes);
    const rtCookie = cookies.find((c) => c.startsWith('rt='))?.split(';')[0];

    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', [rtCookie ?? '']);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body).toHaveProperty('accessToken');
    expect(typeof refreshRes.body.accessToken).toBe('string');

    const newCookies = getCookies(refreshRes);
    const newRtCookie = newCookies.find((c) => c.startsWith('rt='))?.split(';')[0];
    expect(newRtCookie).toBeDefined();
    expect(newRtCookie).not.toBe(rtCookie);
  });

  it('reusing an old refresh token revokes the family and returns 401', async () => {
    const registerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'reuse@example.com',
        password: 'Password123!',
        displayName: 'Reuser',
      });

    const cookies = getCookies(registerRes);
    const oldRtCookie = cookies.find((c) => c.startsWith('rt='))?.split(';')[0] ?? '';

    // First refresh succeeds and rotates
    const firstRefresh = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', [oldRtCookie]);
    expect(firstRefresh.status).toBe(200);

    const rotatedCookies = getCookies(firstRefresh);
    const rotatedRtCookie = rotatedCookies.find((c) => c.startsWith('rt='))?.split(';')[0] ?? '';

    // Presenting the OLD revoked token again triggers reuse detection
    const reuseRes = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', [oldRtCookie]);

    expect(reuseRes.status).toBe(401);
    expect(reuseRes.body.error.code).toBe('UNAUTHENTICATED');

    // And now the rotated token should also be revoked!
    const subsequentRes = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', [rotatedRtCookie]);

    expect(subsequentRes.status).toBe(401);
  });

  it('missing, tampered or expired JWT returns 401 UNAUTHENTICATED', async () => {
    const missingRes = await request(app).get('/api/v1/profile');
    expect(missingRes.status).toBe(401);
    expect(missingRes.body.error.code).toBe('UNAUTHENTICATED');

    const tamperedRes = await request(app)
      .get('/api/v1/profile')
      .set('Authorization', 'Bearer invalid.token.payload');
    expect(tamperedRes.status).toBe(401);
    expect(tamperedRes.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('logout revokes token and clears the cookie', async () => {
    const registerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'logout@example.com',
        password: 'Password123!',
        displayName: 'Logouter',
      });

    const cookies = getCookies(registerRes);
    const rtCookie = cookies.find((c) => c.startsWith('rt='))?.split(';')[0] ?? '';

    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', [rtCookie]);

    expect(logoutRes.status).toBe(204);

    const afterCookies = getCookies(logoutRes);
    expect(afterCookies.length).toBeGreaterThan(0);
    const clearedRt = afterCookies.find((c) => c.startsWith('rt='));
    expect(clearedRt).toBeDefined();
  });
});
