import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { validate } from '../../middleware/validate.js';
import { AppError } from '../../lib/errors.js';
import {
  createTaskSchema,
  updateTaskSchema,
  listTasksQuerySchema,
  taskParamsSchema,
  applyPrioritiesSchema,
  type CreateTaskInput,
  type UpdateTaskInput,
  type ListTasksQuery,
  type ApplyPrioritiesInput,
} from './tasks.schemas.js';
import { tasksService } from './tasks.service.js';

export const tasksRouter = Router();

tasksRouter.use(requireAuth);

function getUserId(req: Request): string {
  if (!req.userId) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Missing or invalid access token');
  }
  return req.userId;
}

// GET /api/v1/tasks - List tasks
tasksRouter.get(
  '/',
  validate({ query: listTasksQuerySchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const query = req.query as unknown as ListTasksQuery;
      const tasks = await tasksService.listTasks(userId, query);
      res.status(200).json(tasks);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/v1/tasks/stats - Task statistics
tasksRouter.get(
  '/stats',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const stats = await tasksService.getTaskStats(userId);
      res.status(200).json(stats);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/v1/tasks - Create task
tasksRouter.post(
  '/',
  validate({ body: createTaskSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const input = req.body as CreateTaskInput;
      const task = await tasksService.createTask(userId, input);
      res.status(201).json(task);
    } catch (err) {
      next(err);
    }
  },
);

// GET & POST /api/v1/tasks/ai-prioritize - AI Task Prioritization suggestions
tasksRouter.get(
  '/ai-prioritize',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const prioritization = await tasksService.getAiPrioritization(userId);
      res.status(200).json(prioritization);
    } catch (err) {
      next(err);
    }
  },
);

tasksRouter.post(
  '/ai-prioritize',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const prioritization = await tasksService.getAiPrioritization(userId);
      res.status(200).json(prioritization);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/v1/tasks/apply-priorities - Confirm & apply prioritized updates
tasksRouter.post(
  '/apply-priorities',
  validate({ body: applyPrioritiesSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const input = req.body as ApplyPrioritiesInput;
      const result = await tasksService.applyPriorities(userId, input);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/v1/tasks/:id - Single task details with sessions
tasksRouter.get(
  '/:id',
  validate({ params: taskParamsSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const task = await tasksService.getTask(userId, req.params.id);
      res.status(200).json(task);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/v1/tasks/:id - Update task
tasksRouter.patch(
  '/:id',
  validate({ params: taskParamsSchema, body: updateTaskSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const input = req.body as UpdateTaskInput;
      const updated = await tasksService.updateTask(userId, req.params.id, input);
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/v1/tasks/:id - Delete task
tasksRouter.delete(
  '/:id',
  validate({ params: taskParamsSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      await tasksService.deleteTask(userId, req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);
