import express, { type Express, type Request, type Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { httpLogger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';
import { checkAiHealth } from './lib/aiClient.js';
import { globalLimiter } from './middleware/limiters.js';
import { errorHandler } from './middleware/errorHandler.js';
import { openApiSpec, renderSwaggerHtml } from './docs/swagger.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { profileRouter } from './modules/profile/profile.routes.js';
import { goalsRouter } from './modules/goals/goals.routes.js';
import { devicesRouter } from './modules/devices/devices.routes.js';
import { ingestRouter } from './modules/ingest/ingest.routes.js';
import { activityRouter } from './modules/activity/activity.routes.js';
import { statsRouter } from './modules/stats/stats.routes.js';
import { analyticsRouter } from './modules/analytics/analytics.routes.js';
import { focusRouter } from './modules/focus/focus.routes.js';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: false, // Allows Swagger UI CDN scripts & styles
    })
  );

  // Support Chrome Private Network Access (PNA) for local extensions and web clients
  app.use((req: Request, res: Response, next) => {
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Private-Network', 'true');
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || env.CORS_ORIGINS.includes(origin) || origin.startsWith('chrome-extension://')) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
    })
  );

  app.use(cookieParser());
  app.use(express.json({ limit: '256kb' }));
  app.use(httpLogger);
  app.use(globalLimiter);

  // Interactive Swagger UI documentation
  app.get('/openapi.json', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(openApiSpec);
  });

  app.get('/docs', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(renderSwaggerHtml());
  });

  // Health and readiness checks
  app.get('/healthz', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  app.get('/readyz', async (_req: Request, res: Response) => {
    let dbStatus: 'up' | 'down' = 'down';
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'up';
    } catch {
      dbStatus = 'down';
    }

    const aiStatus = await checkAiHealth();

    const isReady = dbStatus === 'up';
    res.status(isReady ? 200 : 503).json({
      db: dbStatus,
      ai: aiStatus,
    });
  });

  // Mount API modules under /api/v1
  const apiRouter = express.Router();
  apiRouter.use('/auth', authRouter);
  apiRouter.use('/profile', profileRouter);
  apiRouter.use('/goals', goalsRouter);
  apiRouter.use('/devices', devicesRouter);
  apiRouter.use('/ingest', ingestRouter);
  apiRouter.use('/activity', activityRouter);
  apiRouter.use('/stats', statsRouter);
  apiRouter.use('/analytics', analyticsRouter);
  apiRouter.use('/focus-sessions', focusRouter);

  app.use('/api/v1', apiRouter);

  // Direct Chrome extension activity sync endpoint
  app.post('/api/activity', async (req: Request, res: Response): Promise<void> => {
    try {
      const defaultUser = await prisma.user.findFirst({
        where: { email: 'yashpathak086@gmail.com' },
      }) || await prisma.user.findFirst();

      if (!defaultUser) {
        res.status(200).json({ status: 'ok', message: 'No registered user found' }); return;
      }

      let device = await prisma.device.findFirst({
        where: { userId: defaultUser.id, revokedAt: null },
        orderBy: { lastSeenAt: 'desc' },
      });

      if (!device) {
        device = await prisma.device.create({
          data: {
            userId: defaultUser.id,
            name: 'Google Chrome',
            platform: 'chrome',
            tokenHash: 'dev_ext_' + Date.now(),
            lastSeenAt: new Date(),
          },
        });
      } else {
        await prisma.device.update({
          where: { id: device.id },
          data: { lastSeenAt: new Date() },
        });
      }

      const raw = req.body || {};
      const domain = (raw.domain || (raw.url ? new URL(raw.url).hostname.replace(/^www\./, '') : 'unknown')).toLowerCase();
      const durationSec = Math.max(1, Number(raw.duration_seconds || raw.durationSec || 1));
      const endedAt = raw.ended_at || raw.endedAt ? new Date(raw.ended_at || raw.endedAt) : new Date();
      const startedAt = raw.started_at || raw.startedAt ? new Date(raw.started_at || raw.startedAt) : new Date(endedAt.getTime() - durationSec * 1000);
      const clientEventId = raw.clientEventId || ('evt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8));

      const { ingestService } = await import('./modules/ingest/ingest.service.js');
      const result = await ingestService.ingestActivity(defaultUser.id, device.id, {
        events: [
          {
            clientEventId,
            source: 'browser',
            domain,
            startedAt: startedAt.toISOString(),
            endedAt: endedAt.toISOString(),
            idle: Boolean(raw.idle),
          },
        ],
      });

      // Record context switch if transitioning from another domain
      try {
        const previousActivity = await prisma.activityLog.findFirst({
          where: {
            userId: defaultUser.id,
            deviceId: device.id,
            domain: { not: domain },
          },
          orderBy: { endedAt: 'desc' },
        });

        if (previousActivity && Math.abs(startedAt.getTime() - previousActivity.endedAt.getTime()) < 300000) {
          await prisma.contextSwitch.create({
            data: {
              userId: defaultUser.id,
              deviceId: device.id,
              clientEventId: 'sw_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
              fromApp: previousActivity.domain ?? previousActivity.appName ?? 'unknown',
              toApp: domain,
              switchedAt: startedAt,
            },
          });
        }
      } catch {
        // Non-blocking
      }

      res.status(200).json({ status: 'ok', result }); return;
    } catch (err) {
      console.error('Error in /api/activity:', err);
      res.status(200).json({ status: 'received_with_fallback' }); return;
    }
  });

  app.get('/api/activity', async (_req: Request, res: Response): Promise<void> => {
    try {
      const records = await prisma.activityLog.findMany({
        take: 50,
        orderBy: { endedAt: 'desc' },
      });
      res.status(200).json(records); return;
    } catch {
      res.status(200).json([]); return;
    }
  });

  // Status root page
  app.get('/', (_req: Request, res: Response) => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Attention Platform API</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 40px; background: #0f172a; color: #f8fafc; }
    h1 { color: #38bdf8; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; background: #22c55e; color: #000; font-weight: bold; }
    .btn { display: inline-block; padding: 10px 16px; margin: 10px 10px 10px 0; border-radius: 6px; background: #0284c7; color: #fff; text-decoration: none; font-weight: 600; }
    .btn:hover { background: #0369a1; }
    table { border-collapse: collapse; width: 100%; margin-top: 20px; background: #1e293b; border-radius: 8px; overflow: hidden; }
    th, td { text-align: left; padding: 12px; border-bottom: 1px solid #334155; }
    th { background: #0284c7; color: #fff; }
    a { color: #38bdf8; text-decoration: none; }
  </style>
</head>
<body>
  <h1>Digital Attention Management API</h1>
  <p>Status: <span class="badge">ONLINE</span></p>
  <p>
    <a href="/docs" class="btn">🚀 Open Interactive Swagger Docs (/docs)</a>
    <a href="http://localhost:5173" target="_blank" class="btn" style="background:#475569;">💻 Open Web Dashboard (5173)</a>
  </p>
  <h2>Registered Endpoints (/api/v1)</h2>
  <table>
    <thead>
      <tr><th>Tag</th><th>Method</th><th>Path</th><th>Description</th></tr>
    </thead>
    <tbody>
      <tr><td>Docs</td><td>GET</td><td>/docs</td><td>Interactive Swagger UI</td></tr>
      <tr><td>Ops</td><td>GET</td><td>/healthz</td><td>Liveness check</td></tr>
      <tr><td>Ops</td><td>GET</td><td>/readyz</td><td>Readiness check (PostgreSQL & AI)</td></tr>
      <tr><td>Auth</td><td>POST</td><td>/api/v1/auth/register</td><td>User registration</td></tr>
      <tr><td>Auth</td><td>POST</td><td>/api/v1/auth/login</td><td>User login</td></tr>
      <tr><td>Auth</td><td>POST</td><td>/api/v1/auth/refresh</td><td>Rotate access & refresh tokens</td></tr>
      <tr><td>Auth</td><td>POST</td><td>/api/v1/auth/logout</td><td>Logout session</td></tr>
      <tr><td>Profile</td><td>GET, PATCH</td><td>/api/v1/profile</td><td>Profile configuration</td></tr>
      <tr><td>Goals</td><td>GET, POST, PATCH, DELETE</td><td>/api/v1/goals</td><td>User focus goals</td></tr>
      <tr><td>Focus</td><td>GET, POST, PATCH</td><td>/api/v1/focus-sessions</td><td>Focus sessions tracking</td></tr>
      <tr><td>Stats</td><td>GET</td><td>/api/v1/stats/today</td><td>Daily summary metrics</td></tr>
      <tr><td>Analytics</td><td>GET</td><td>/api/v1/analytics/*</td><td>Cognitive attention score, distraction detection & predictions</td></tr>
      <tr><td>Devices</td><td>GET, POST, DELETE</td><td>/api/v1/devices</td><td>Manage paired devices</td></tr>
      <tr><td>Ingest</td><td>POST</td><td>/api/v1/ingest/*</td><td>Ingest telemetry (activity, switches, notifs)</td></tr>
    </tbody>
  </table>
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found',
      },
    });
  });

  // Central error handling
  app.use(errorHandler);

  return app;
}

export const app: Express = createApp();
