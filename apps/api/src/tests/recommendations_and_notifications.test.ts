import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { createTestUser, getAuthToken } from './helpers.js';

const app = createApp();

describe('Recommendations, Smart Planner, and Notifications API', () => {
  it('generates behavioral analysis and returns recommendations', async () => {
    const { user } = await createTestUser(`user_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`);
    const token = await getAuthToken(user.id);

    const res = await request(app)
      .get('/api/v1/recommendations/behavioral-analysis')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('behavioralDiagnosis');
    expect(res.body).toHaveProperty('peakFocusWindow');
    expect(res.body).toHaveProperty('recommendations');
    expect(Array.isArray(res.body.recommendations)).toBe(true);
  });

  it('lists recommendations and permits status updates', async () => {
    const { user } = await createTestUser(`user_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`);
    const token = await getAuthToken(user.id);

    // Trigger analysis to populate recommendations
    await request(app)
      .get('/api/v1/recommendations/behavioral-analysis')
      .set('Authorization', `Bearer ${token}`);

    const listRes = await request(app)
      .get('/api/v1/recommendations')
      .set('Authorization', `Bearer ${token}`);

    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.length).toBeGreaterThan(0);

    const firstRec = listRes.body[0];
    expect(firstRec.status).toBe('pending');

    // Update status to accepted
    const updateRes = await request(app)
      .patch(`/api/v1/recommendations/${firstRec.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'accepted' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.status).toBe('accepted');
  });

  it('returns smart focus planner suggestions based on activity', async () => {
    const { user } = await createTestUser(`user_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`);
    const token = await getAuthToken(user.id);

    const planRes = await request(app)
      .get('/api/v1/focus-sessions/planner')
      .set('Authorization', `Bearer ${token}`);

    expect(planRes.status).toBe(200);
    expect(planRes.body).toHaveProperty('optimalDuration');
    expect(planRes.body).toHaveProperty('breakSuggestion');
    expect(planRes.body).toHaveProperty('highFocusWindows');
    expect(Array.isArray(planRes.body.highFocusWindows)).toBe(true);
  });

  it('calculates habit streaks and goal history', async () => {
    const { user } = await createTestUser(`user_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`);
    const token = await getAuthToken(user.id);

    // Create a goal
    await request(app)
      .post('/api/v1/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'focus_minutes',
        period: 'daily',
        targetValue: 60,
      });

    const habitRes = await request(app)
      .get('/api/v1/goals/habits')
      .set('Authorization', `Bearer ${token}`);

    expect(habitRes.status).toBe(200);
    expect(habitRes.body).toHaveProperty('currentStreak');
    expect(habitRes.body).toHaveProperty('weeklyCompletionRate');
    expect(habitRes.body).toHaveProperty('historyDays');
    expect(habitRes.body.historyDays.length).toBe(7);
  });

  it('manages notification preferences and evaluates smart alerts', async () => {
    const { user } = await createTestUser(`user_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`);
    const token = await getAuthToken(user.id);

    // 1. Get default preferences
    const prefRes = await request(app)
      .get('/api/v1/notifications/preferences')
      .set('Authorization', `Bearer ${token}`);

    expect(prefRes.status).toBe(200);
    expect(prefRes.body.distractionAlerts).toBe(true);

    // 2. Update preferences
    const updatePrefRes = await request(app)
      .put('/api/v1/notifications/preferences')
      .set('Authorization', `Bearer ${token}`)
      .send({
        quietHoursEnabled: true,
        quietHoursStart: '23:00',
        quietHoursEnd: '07:00',
      });

    expect(updatePrefRes.status).toBe(200);
    expect(updatePrefRes.body.quietHoursEnabled).toBe(true);

    // 3. Evaluate alerts
    const evalRes = await request(app)
      .post('/api/v1/notifications/evaluate')
      .set('Authorization', `Bearer ${token}`);

    expect(evalRes.status).toBe(200);
    expect(evalRes.body).toHaveProperty('generated');

    // 4. List alerts
    const alertsRes = await request(app)
      .get('/api/v1/notifications/alerts')
      .set('Authorization', `Bearer ${token}`);

    expect(alertsRes.status).toBe(200);
    expect(Array.isArray(alertsRes.body)).toBe(true);
  });
});
