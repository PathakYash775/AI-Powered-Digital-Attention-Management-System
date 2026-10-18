import { http, HttpResponse } from 'msw';
import { getDb, getSummaryForDate } from './db';
import type { ActivitySession, Goal, OccupationType, Profile, RegisterPayload } from '../api/types';

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.replace('Bearer ', '');
  return token !== '' && token !== 'expired';
}

function paginate<T extends { id: string }>(
  items: T[],
  limitParam: string | null,
  cursorParam: string | null,
): { items: T[]; nextCursor: string | null } {
  const limit = limitParam ? parseInt(limitParam, 10) : 10;
  let startIndex = 0;

  if (cursorParam) {
    const found = items.findIndex((it) => it.id === cursorParam);
    if (found !== -1) {
      startIndex = found + 1;
    }
  }

  const pageItems = items.slice(startIndex, startIndex + limit);
  const nextItem = items[startIndex + limit];
  const nextCursor = nextItem ? nextItem.id : null;

  return { items: pageItems, nextCursor };
}

export const handlers = [
  // Auth: Register
  http.post('*/auth/register', async ({ request }) => {
    const body = (await request.json()) as RegisterPayload;
    const { email, password, displayName } = body;

    if (!email || !email.includes('@')) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Valid email is required' } },
        { status: 400 },
      );
    }

    if (!password || password.length < 10 || password.length > 128) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Password must be between 10 and 128 characters',
          },
        },
        { status: 400 },
      );
    }

    if (!displayName || displayName.trim().length === 0) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Display name is required' } },
        { status: 400 },
      );
    }

    const db = getDb();
    const existing = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Email already registered' } },
        { status: 400 },
      );
    }

    const newUser = {
      id: `user-${Date.now()}`,
      email: email.trim().toLowerCase(),
      displayName: displayName.trim(),
      passwordHash: password,
    };
    db.users.push(newUser);

    return HttpResponse.json({
      accessToken: 'mock-access-token-valid',
      user: { id: newUser.id, email: newUser.email },
    });
  }),

  // Auth: Login
  http.post('*/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };
    const { email, password } = body;

    const db = getDb();
    const user = db.users.find(
      (u) =>
        u.email.toLowerCase() === (email || '').trim().toLowerCase() && u.passwordHash === password,
    );

    if (!user) {
      return HttpResponse.json(
        { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } },
        { status: 401 },
      );
    }

    return HttpResponse.json({
      accessToken: 'mock-access-token-valid',
      user: { id: user.id, email: user.email },
    });
  }),

  // Auth: Refresh
  http.post('*/auth/refresh', () => {
    const db = getDb();
    if (!db.validRefreshToken) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Refresh token expired' } },
        { status: 401 },
      );
    }

    return HttpResponse.json({
      accessToken: 'mock-access-token-refreshed',
    });
  }),

  // Auth: Logout
  http.post('*/auth/logout', () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // Profile: GET
  http.get('*/profile', ({ request }) => {
    if (!isAuthorized(request)) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 },
      );
    }
    const db = getDb();
    return HttpResponse.json(db.profile);
  }),

  // Profile: PATCH
  http.patch('*/profile', async ({ request }) => {
    if (!isAuthorized(request)) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 },
      );
    }

    const body = (await request.json()) as Partial<Profile>;
    const db = getDb();
    db.profile = {
      ...db.profile,
      ...body,
      displayName: body.displayName ?? db.profile.displayName,
      timezone: body.timezone ?? db.profile.timezone,
      occupationType: (body.occupationType ?? db.profile.occupationType) as OccupationType,
      workStart: body.workStart ?? db.profile.workStart,
      workEnd: body.workEnd ?? db.profile.workEnd,
    };

    return HttpResponse.json(db.profile);
  }),

  // Goals: GET
  http.get('*/goals', ({ request }) => {
    if (!isAuthorized(request)) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 },
      );
    }
    const db = getDb();
    return HttpResponse.json(db.goals);
  }),

  // Goals: POST
  http.post('*/goals', async ({ request }) => {
    if (!isAuthorized(request)) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 },
      );
    }

    const db = getDb();
    if (db.goals.length >= 20) {
      return HttpResponse.json(
        { error: { code: 'LIMIT_EXCEEDED', message: 'Maximum 20 goals allowed' } },
        { status: 400 },
      );
    }

    const body = (await request.json()) as Omit<Goal, 'id'>;
    if (body.targetValue < 1 || body.targetValue > 10080) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Target value must be between 1 and 10080',
          },
        },
        { status: 400 },
      );
    }

    const newGoal: Goal = {
      id: `goal-${Date.now()}`,
      type: body.type,
      period: body.period,
      targetValue: Math.round(body.targetValue),
    };
    db.goals.push(newGoal);

    return HttpResponse.json(newGoal, { status: 201 });
  }),

  // Goals: PATCH
  http.patch('*/goals/:id', async ({ request, params }) => {
    if (!isAuthorized(request)) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 },
      );
    }

    const db = getDb();
    const index = db.goals.findIndex((g) => g.id === params.id);
    if (index === -1) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Goal not found' } },
        { status: 404 },
      );
    }

    const body = (await request.json()) as Partial<Goal>;
    if (body.targetValue !== undefined && (body.targetValue < 1 || body.targetValue > 10080)) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Target value must be between 1 and 10080',
          },
        },
        { status: 400 },
      );
    }

    db.goals[index] = {
      ...db.goals[index],
      ...body,
      targetValue:
        body.targetValue !== undefined ? Math.round(body.targetValue) : db.goals[index].targetValue,
    };

    return HttpResponse.json(db.goals[index]);
  }),

  // Goals: DELETE
  http.delete('*/goals/:id', ({ request, params }) => {
    if (!isAuthorized(request)) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 },
      );
    }

    const db = getDb();
    const index = db.goals.findIndex((g) => g.id === params.id);
    if (index === -1) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Goal not found' } },
        { status: 404 },
      );
    }

    db.goals.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // Activity: Summary
  http.get('*/activity/summary', ({ request }) => {
    if (!isAuthorized(request)) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 },
      );
    }

    const url = new URL(request.url);
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
    const summary = getSummaryForDate(date);
    return HttpResponse.json(summary);
  }),

  // Activity: Sessions
  http.get('*/activity/sessions', ({ request }) => {
    if (!isAuthorized(request)) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 },
      );
    }

    const url = new URL(request.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const limit = url.searchParams.get('limit');
    const cursor = url.searchParams.get('cursor');

    const db = getDb();
    let filtered = db.sessions;
    if (from) {
      filtered = filtered.filter((s) => s.startedAt >= from);
    }
    if (to) {
      filtered = filtered.filter((s) => s.startedAt <= to + 'T23:59:59.999Z');
    }

    const result = paginate<ActivitySession>(filtered, limit, cursor);
    return HttpResponse.json(result);
  }),

  // Activity: Switches
  http.get('*/activity/switches', ({ request }) => {
    if (!isAuthorized(request)) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 },
      );
    }

    const url = new URL(request.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const limit = url.searchParams.get('limit');
    const cursor = url.searchParams.get('cursor');

    const db = getDb();
    let filtered = db.switches;
    if (from) {
      filtered = filtered.filter((s) => s.switchedAt >= from);
    }
    if (to) {
      filtered = filtered.filter((s) => s.switchedAt <= to + 'T23:59:59.999Z');
    }

    const result = paginate(filtered, limit, cursor);
    return HttpResponse.json(result);
  }),

  // Activity: Notifications
  http.get('*/activity/notifications', ({ request }) => {
    if (!isAuthorized(request)) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 },
      );
    }

    const url = new URL(request.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const limit = url.searchParams.get('limit');
    const cursor = url.searchParams.get('cursor');

    const db = getDb();
    let filtered = db.notifications;
    if (from) {
      filtered = filtered.filter((n) => n.receivedAt >= from);
    }
    if (to) {
      filtered = filtered.filter((n) => n.receivedAt <= to + 'T23:59:59.999Z');
    }

    const result = paginate(filtered, limit, cursor);
    return HttpResponse.json(result);
  }),
];
