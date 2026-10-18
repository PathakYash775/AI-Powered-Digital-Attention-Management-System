import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { validate } from '../../middleware/validate.js';
import { AppError } from '../../lib/errors.js';
import {
  focusParamsSchema,
  listFocusSessionsQuerySchema,
  startFocusSessionSchema,
  stopFocusSessionSchema,
  type ListFocusSessionsQuery,
} from './focus.schemas.js';
import { focusService } from './focus.service.js';

export const focusRouter = Router();

focusRouter.use(requireAuth);

function getUserId(req: Request): string {
  if (!req.userId) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Missing or invalid access token');
  }
  return req.userId;
}

focusRouter.post(
  '/start',
  validate({ body: startFocusSessionSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const session = await focusService.startSession(userId, req.body);
      res.status(201).json(session);
    } catch (err) {
      next(err);
    }
  },
);

focusRouter.post(
  '/',
  validate({ body: startFocusSessionSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const session = await focusService.startSession(userId, req.body);
      res.status(201).json(session);
    } catch (err) {
      next(err);
    }
  },
);

focusRouter.post(
  '/:id/stop',
  validate({ params: focusParamsSchema, body: stopFocusSessionSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const session = await focusService.stopSession(userId, req.params.id, req.body);
      res.status(200).json(session);
    } catch (err) {
      next(err);
    }
  },
);

focusRouter.patch(
  '/:id',
  validate({ params: focusParamsSchema, body: stopFocusSessionSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const session = await focusService.stopSession(userId, req.params.id, req.body);
      res.status(200).json(session);
    } catch (err) {
      next(err);
    }
  },
);

focusRouter.get(
  '/active',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const session = await focusService.getActiveSession(userId);
      res.status(200).json(session);
    } catch (err) {
      next(err);
    }
  },
);

focusRouter.get(
  '/',
  validate({ query: listFocusSessionsQuerySchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const query = req.query as unknown as ListFocusSessionsQuery;
      const result = await focusService.listSessions(userId, query);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);
