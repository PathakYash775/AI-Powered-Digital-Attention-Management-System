import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { validate } from '../../middleware/validate.js';
import { AppError } from '../../lib/errors.js';
import {
  createGoalSchema,
  goalParamsSchema,
  updateGoalSchema,
} from './goals.schemas.js';
import { goalsService } from './goals.service.js';

export const goalsRouter = Router();

goalsRouter.use(requireAuth);

function getUserId(req: Request): string {
  if (!req.userId) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Missing or invalid access token');
  }
  return req.userId;
}

goalsRouter.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = getUserId(req);
    const goals = await goalsService.getGoals(userId);
    res.status(200).json(goals);
  } catch (err) {
    next(err);
  }
});

goalsRouter.post(
  '/',
  validate({ body: createGoalSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const goal = await goalsService.createGoal(userId, req.body);
      res.status(201).json(goal);
    } catch (err) {
      next(err);
    }
  },
);

goalsRouter.patch(
  '/:id',
  validate({ params: goalParamsSchema, body: updateGoalSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const goal = await goalsService.updateGoal(userId, req.params.id, req.body);
      res.status(200).json(goal);
    } catch (err) {
      next(err);
    }
  },
);

goalsRouter.delete(
  '/:id',
  validate({ params: goalParamsSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      await goalsService.deleteGoal(userId, req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);
