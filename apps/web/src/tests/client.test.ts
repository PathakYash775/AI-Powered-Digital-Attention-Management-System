import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { apiClient, getAccessToken, setAccessToken, setOnUnauthorized } from '../api/client';

let refreshCallCount = 0;
let requestCount = 0;

const server = setupServer(
  http.post('*/auth/refresh', () => {
    refreshCallCount++;
    return HttpResponse.json({ accessToken: 'new-valid-token' });
  }),
  http.get('*/test-endpoint', ({ request }) => {
    requestCount++;
    const auth = request.headers.get('Authorization');
    if (auth === 'Bearer new-valid-token') {
      return HttpResponse.json({ success: true });
    }
    return HttpResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Token expired' } },
      { status: 401 },
    );
  }),
);

describe('apiClient 401 interception and refresh flow', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'bypass' });
  });

  beforeEach(() => {
    refreshCallCount = 0;
    requestCount = 0;
    setAccessToken('expired-token');
  });

  afterEach(() => {
    server.resetHandlers();
    setAccessToken(null);
    setOnUnauthorized(null);
  });

  afterAll(() => {
    server.close();
  });

  it('concurrent 401s trigger exactly ONE refresh and each request is retried once', async () => {
    const [res1, res2] = await Promise.all([
      apiClient.get('/test-endpoint'),
      apiClient.get('/test-endpoint'),
    ]);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res1.data).toEqual({ success: true });
    expect(res2.data).toEqual({ success: true });
    expect(refreshCallCount).toBe(1);
    expect(requestCount).toBe(4);
    expect(getAccessToken()).toBe('new-valid-token');
  });

  it('refresh failure redirects to /login and clears the access token', async () => {
    server.use(
      http.post('*/auth/refresh', () => {
        return HttpResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'Session expired' } },
          { status: 401 },
        );
      }),
    );

    let unauthorizedTriggered = false;
    setOnUnauthorized(() => {
      unauthorizedTriggered = true;
    });

    await expect(apiClient.get('/test-endpoint')).rejects.toThrow();

    expect(unauthorizedTriggered).toBe(true);
    expect(getAccessToken()).toBeNull();
  });
});
