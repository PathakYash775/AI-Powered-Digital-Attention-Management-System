import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { activityService } from '../activity/activity.service.js';
import { AppError } from '../../lib/errors.js';

export const statsRouter = Router();

statsRouter.use(requireAuth);

statsRouter.get('/today', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.userId) throw new AppError(401, 'UNAUTHENTICATED', 'Missing or invalid access token');
    const today = new Date().toISOString().slice(0, 10);
    const summary = await activityService.getSummary(req.userId, today);
    res.status(200).json(summary);
  } catch (err) {
    next(err);
  }
});

statsRouter.get('/range', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.userId) throw new AppError(401, 'UNAUTHENTICATED', 'Missing or invalid access token');
    const date = (req.query.to as string) || new Date().toISOString().slice(0, 10);
    const summary = await activityService.getSummary(req.userId, date);
    res.status(200).json(summary);
  } catch (err) {
    next(err);
  }
});
