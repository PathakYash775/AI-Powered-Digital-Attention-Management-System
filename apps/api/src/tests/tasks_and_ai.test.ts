import { describe, it, expect, beforeEach } from 'vitest';
import {
  request,
  app,
  createTestUser,
  getAuthToken,
  resetDatabase,
} from './helpers.js';

describe('Tasks Management & AI Intelligence API', () => {
  let userToken: string;
  let userId: string;
  let otherToken: string;
  let otherUserId: string;

  beforeEach(async () => {
    await resetDatabase();
    const u1 = await createTestUser('task_user1@example.com', 'Pass1234!', 'User One');
    userId = u1.user.id;
    userToken = await getAuthToken(userId);

    const u2 = await createTestUser('task_user2@example.com', 'Pass1234!', 'User Two');
    otherUserId = u2.user.id;
    otherToken = await getAuthToken(otherUserId);
  });

  describe('Tasks CRUD & Isolation', () => {
    it('creates, lists, updates, and deletes tasks for authenticated user', async () => {
      // 1. Create task
      const createRes = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Implement AI recommendation engine',
          description: 'Build grounded recommendations based on actual user activity',
          category: 'development',
          priority: 'high',
          estimatedMinutes: 90,
          deadline: new Date(Date.now() + 86400000).toISOString(),
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.title).toBe('Implement AI recommendation engine');
      expect(createRes.body.priority).toBe('high');
      expect(createRes.body.status).toBe('todo');
      const taskId = createRes.body.id;

      // 2. List tasks
      const listRes = await request(app)
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${userToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.length).toBe(1);
      expect(listRes.body[0].id).toBe(taskId);

      // 3. User isolation: other user cannot see task
      const otherListRes = await request(app)
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${otherToken}`);

      expect(otherListRes.status).toBe(200);
      expect(otherListRes.body.length).toBe(0);

      // 4. Update task
      const updateRes = await request(app)
        .patch(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          status: 'in_progress',
          priority: 'urgent',
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.status).toBe('in_progress');
      expect(updateRes.body.priority).toBe('urgent');

      // 5. Other user cannot update task
      const unauthorizedUpdate = await request(app)
        .patch(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ status: 'completed' });

      expect(unauthorizedUpdate.status).toBe(404);

      // 6. Delete task
      const deleteRes = await request(app)
        .delete(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect([200, 204]).toContain(deleteRes.status);

      const verifyList = await request(app)
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${userToken}`);
      expect(verifyList.body.length).toBe(0);
    });

    it('calculates task statistics accurately', async () => {
      // Create 2 tasks: 1 todo, 1 completed
      await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Task A',
          category: 'work',
          priority: 'medium',
          estimatedMinutes: 30,
        });

      const t2 = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Task B',
          category: 'work',
          priority: 'high',
          estimatedMinutes: 45,
        });

      await request(app)
        .patch(`/api/v1/tasks/${t2.body.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ status: 'completed' });

      const statsRes = await request(app)
        .get('/api/v1/tasks/stats')
        .set('Authorization', `Bearer ${userToken}`);

      expect(statsRes.status).toBe(200);
      expect(statsRes.body.total).toBe(2);
      expect(statsRes.body.completed).toBe(1);
      expect(statsRes.body.completionRate).toBe(50);
    });

    it('links focus session with task and transitions task to in_progress', async () => {
      const taskRes = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Focus Task',
          category: 'coding',
          priority: 'urgent',
          estimatedMinutes: 45,
        });
      const taskId = taskRes.body.id;

      // Start focus session linked to this task
      const sessionRes = await request(app)
        .post('/api/v1/focus-sessions/start')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          plannedMin: 45,
          taskId,
        });

      expect(sessionRes.status).toBe(201);
      expect(sessionRes.body.taskId).toBe(taskId);

      // Verify task status transitioned to in_progress
      const taskGet = await request(app)
        .get(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(taskGet.status).toBe(200);
      expect(taskGet.body.status).toBe('in_progress');
    });

    it('returns AI prioritization suggestions with telemetry rationale', async () => {
      await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Urgent Task',
          priority: 'urgent',
          category: 'client',
          estimatedMinutes: 60,
        });

      await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Low Priority Task',
          priority: 'low',
          category: 'admin',
          estimatedMinutes: 15,
        });

      const prioRes = await request(app)
        .get('/api/v1/tasks/ai-prioritize')
        .set('Authorization', `Bearer ${userToken}`);

      expect(prioRes.status).toBe(200);
      expect(prioRes.body).toHaveProperty('prioritizedTasks');
      expect(prioRes.body).toHaveProperty('summary');
      expect(Array.isArray(prioRes.body.prioritizedTasks)).toBe(true);
      expect(prioRes.body.prioritizedTasks.length).toBe(2);
    });
  });

  describe('AI Intelligence & Model Transparency', () => {
    it('returns model transparency specifications distinguishing calculations vs ML vs heuristics', async () => {
      const res = await request(app)
        .get('/api/v1/ai/model-info')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('regressor');
      expect(res.body).toHaveProperty('classifier');
      expect(res.body).toHaveProperty('featureInputs');
      expect(res.body).toHaveProperty('distinctions');
      expect(res.body.regressor.modelName).toContain('RandomForestRegressor');
      expect(res.body.classifier.modelName).toContain('RandomForestClassifier');
      expect(res.body.distinctions.calculatedMetrics).toBeDefined();
      expect(res.body.distinctions.ruleBasedFindings).toBeDefined();
      expect(res.body.distinctions.mlPredictions).toBeDefined();
    });

    it('generates structured daily briefing grounded in telemetry', async () => {
      const res = await request(app)
        .get('/api/v1/ai/daily-briefing')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('summary');
      expect(res.body).toHaveProperty('highlights');
      expect(res.body).toHaveProperty('risks');
      expect(res.body).toHaveProperty('suggestedFocusBlocks');
      expect(Array.isArray(res.body.highlights)).toBe(true);
      expect(Array.isArray(res.body.suggestedFocusBlocks)).toBe(true);
    });

    it('generates weekly multi-day AI report', async () => {
      const res = await request(app)
        .get('/api/v1/ai/weekly-report')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('summary');
      expect(res.body).toHaveProperty('keyTrends');
      expect(res.body).toHaveProperty('recommendations');
    });

    it('explains behavioural findings with causal interpretation', async () => {
      const res = await request(app)
        .post('/api/v1/ai/explain')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          findingType: 'context_switch_spike',
          findingDetails: '142 switches recorded across Visual Studio Code, Chrome, and Slack',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('explanation');
      expect(res.body).toHaveProperty('actionableStep');
      expect(typeof res.body.explanation).toBe('string');
    });

    it('answers assistant questions strictly grounded in user activity telemetry', async () => {
      const res = await request(app)
        .post('/api/v1/ai/assistant')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          question: 'When is my best focus time and what is my current focus score?',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('answer');
      expect(res.body).toHaveProperty('groundedDataPoints');
      expect(typeof res.body.answer).toBe('string');
    });
  });
});
