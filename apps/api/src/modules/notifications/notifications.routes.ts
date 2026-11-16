import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { validate } from '../../middleware/validate.js';
import { AppError } from '../../lib/errors.js';
import {
  alertParamsSchema,
  updateNotificationPreferencesSchema,
  type UpdateNotificationPreferencesInput,
} from './notifications.schemas.js';
import { notificationsService } from './notifications.service.js';

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

function getUserId(req: Request): string {
  if (!req.userId) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Missing or invalid access token');
  }
  return req.userId;
}

// GET /api/v1/notifications/preferences
notificationsRouter.get(
  '/preferences',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const prefs = await notificationsService.getPreferences(userId);
      res.status(200).json(prefs);
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/v1/notifications/preferences
notificationsRouter.put(
  '/preferences',
  validate({ body: updateNotificationPreferencesSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const input = req.body as UpdateNotificationPreferencesInput;
      const updated = await notificationsService.updatePreferences(userId, input);
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/v1/notifications/alerts
notificationsRouter.get(
  '/alerts',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const alerts = await notificationsService.getAlerts(userId);
      res.status(200).json(alerts);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/v1/notifications/unread-count
notificationsRouter.get(
  '/unread-count',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const result = await notificationsService.getUnreadCount(userId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/v1/notifications/alerts/read-all
notificationsRouter.patch(
  '/alerts/read-all',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      await notificationsService.markAllRead(userId);
      res.status(200).json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/v1/notifications/alerts/:id/read
notificationsRouter.patch(
  '/alerts/:id/read',
  validate({ params: alertParamsSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const alert = await notificationsService.markAlertRead(userId, req.params.id);
      res.status(200).json(alert);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/v1/notifications/alerts/clear-read
notificationsRouter.delete(
  '/alerts/clear-read',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      await notificationsService.clearRead(userId);
      res.status(200).json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/v1/notifications/alerts/:id
notificationsRouter.delete(
  '/alerts/:id',
  validate({ params: alertParamsSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      await notificationsService.deleteAlert(userId, req.params.id);
      res.status(200).json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/v1/notifications/evaluate
notificationsRouter.post(
  '/evaluate',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const result = await notificationsService.evaluateAndGenerateAlerts(userId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

