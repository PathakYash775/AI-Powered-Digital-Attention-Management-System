import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { validate } from '../../middleware/validate.js';
import { AppError } from '../../lib/errors.js';
import {
  listRecommendationsQuerySchema,
  recommendationParamsSchema,
  updateRecommendationStatusSchema,
  type ListRecommendationsQuery,
} from './recommendations.schemas.js';
import { recommendationsService } from './recommendations.service.js';

export const recommendationsRouter = Router();

recommendationsRouter.use(requireAuth);

function getUserId(req: Request): string {
  if (!req.userId) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Missing or invalid access token');
  }
  return req.userId;
}

// GET /api/v1/recommendations/behavioral-analysis
recommendationsRouter.get(
  '/behavioral-analysis',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const date = req.query.date as string | undefined;
      const data = await recommendationsService.getBehavioralAnalysis(userId, date);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/v1/recommendations
recommendationsRouter.get(
  '/',
  validate({ query: listRecommendationsQuerySchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const query = req.query as unknown as ListRecommendationsQuery;
      const recommendations = await recommendationsService.listRecommendations(userId, query.status);
      res.status(200).json(recommendations);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/v1/recommendations/generate
recommendationsRouter.post(
  '/generate',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const date = req.body?.date as string | undefined;
      const result = await recommendationsService.generateRecommendations(userId, date);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/v1/recommendations/:id/status
recommendationsRouter.patch(
  '/:id/status',
  validate({ params: recommendationParamsSchema, body: updateRecommendationStatusSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const updated = await recommendationsService.updateStatus(userId, req.params.id, req.body.status);
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  },
);

