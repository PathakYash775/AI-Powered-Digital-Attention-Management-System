import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { validate } from '../../middleware/validate.js';
import { AppError } from '../../lib/errors.js';
import { analyticsQuerySchema, simulatePredictionSchema } from './analytics.schemas.js';
import { analyticsService } from './analytics.service.js';

export const analyticsRouter = Router();

analyticsRouter.use(requireAuth);

function getUserId(req: Request): string {
  if (!req.userId) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Missing or invalid access token');
  }
  return req.userId;
}

// GET /api/v1/analytics/daily
analyticsRouter.get(
  '/daily',
  validate({ query: analyticsQuerySchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const date = req.query.date as string | undefined;
      const data = await analyticsService.getDaily(userId, date);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/v1/analytics/focus-score
analyticsRouter.get(
  '/focus-score',
  validate({ query: analyticsQuerySchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const date = req.query.date as string | undefined;
      const data = await analyticsService.getFocusScore(userId, date);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/v1/analytics/distractions
analyticsRouter.get(
  '/distractions',
  validate({ query: analyticsQuerySchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const date = req.query.date as string | undefined;
      const data = await analyticsService.getDistractions(userId, date);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/v1/analytics/predictions
analyticsRouter.get(
  '/predictions',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const data = await analyticsService.getPredictions(userId);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/v1/analytics/simulate
analyticsRouter.post(
  '/simulate',
  validate({ body: simulatePredictionSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await analyticsService.simulatePrediction(req.body);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/v1/analytics/insights
analyticsRouter.get(
  '/insights',
  validate({ query: analyticsQuerySchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const date = req.query.date as string | undefined;
      const data = await analyticsService.getInsights(userId, date);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/v1/analytics/summary
analyticsRouter.get(
  '/summary',
  validate({ query: analyticsQuerySchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const date = req.query.date as string | undefined;
      const data = await analyticsService.getSummary(userId, date);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/v1/analytics/weekly-summary
analyticsRouter.get(
  '/weekly-summary',
  validate({ query: analyticsQuerySchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const date = req.query.date as string | undefined;
      const data = await analyticsService.getWeeklySummary(userId, date);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  },
);
