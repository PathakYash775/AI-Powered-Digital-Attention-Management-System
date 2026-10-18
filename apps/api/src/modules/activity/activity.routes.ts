import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { validate } from '../../middleware/validate.js';
import { AppError } from '../../lib/errors.js';
import {
  activityListQuerySchema,
  activitySummaryQuerySchema,
  type ActivityListQuery,
} from './activity.schemas.js';
import { activityService } from './activity.service.js';

export const activityRouter = Router();

activityRouter.use(requireAuth);

function getUserId(req: Request): string {
  if (!req.userId) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Missing or invalid access token');
  }
  return req.userId;
}

activityRouter.get(
  '/summary',
  validate({ query: activitySummaryQuerySchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const date = req.query.date as string;
      const summary = await activityService.getSummary(userId, date);
      res.status(200).json(summary);
    } catch (err) {
      next(err);
    }
  },
);

activityRouter.get(
  '/report',
  validate({ query: activitySummaryQuerySchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const date = req.query.date as string;
      const report = await activityService.getReport(userId, date);
      res.status(200).json(report);
    } catch (err) {
      next(err);
    }
  },
);

activityRouter.get(
  '/sessions',
  validate({ query: activityListQuerySchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const query = req.query as unknown as ActivityListQuery;
      const result = await activityService.getSessions(userId, query);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

activityRouter.get(
  '/switches',
  validate({ query: activityListQuerySchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const query = req.query as unknown as ActivityListQuery;
      const result = await activityService.getSwitches(userId, query);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

activityRouter.get(
  '/notifications',
  validate({ query: activityListQuerySchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const query = req.query as unknown as ActivityListQuery;
      const result = await activityService.getNotifications(userId, query);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);
