import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { assertTestDatabase } from './helpers.js';

describe('Phase 1 Foundation', () => {
  const app = createApp();

  beforeAll(() => {
    assertTestDatabase();
  });

  it('GET /healthz returns 200 with status ok', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('GET /readyz returns db and ai status properties', async () => {
    const res = await request(app).get('/readyz');
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('db');
    expect(res.body).toHaveProperty('ai');
    expect(['up', 'down']).toContain(res.body.db);
    expect(['up', 'down']).toContain(res.body.ai);
  });

  it('GET / returns plain HTML status page with registered routes', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('Digital Attention Management API');
    expect(res.text).toContain('http://localhost:5173');
    expect(res.text).toContain('/healthz');
  });

  it('test DB guard throws when database name does not end with _test', () => {
    const originalUrl = process.env.DATABASE_URL;
    try {
      process.env.DATABASE_URL = 'postgresql://user:pass@127.0.0.1:5432/attention_prod';
      expect(() => assertTestDatabase()).toThrow('SAFETY VIOLATION');
    } finally {
      process.env.DATABASE_URL = originalUrl;
    }
  });
});
