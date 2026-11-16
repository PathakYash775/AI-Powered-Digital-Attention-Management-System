import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireAdmin } from '../../middleware/requireAdmin.js';
import { validate } from '../../middleware/validate.js';
import {
  userRoleUpdateSchema,
  userStatusUpdateSchema,
  userListQuerySchema,
  categoryCreateSchema,
  categoryUpdateSchema,
} from './admin.schemas.js';
import { adminService } from './admin.service.js';

export const adminRouter = Router();

// Apply auth + admin guard to all routes in this router
adminRouter.use(requireAuth);
adminRouter.use(requireAdmin);

/**
 * GET /api/v1/admin/overview
 * System KPIs, microservices health checks, global category breakdown
 */
adminRouter.get(
  '/overview',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await adminService.getOverview();
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/v1/admin/users
 * Searchable & filterable user list with telemetry aggregates & KPI stats
 */
adminRouter.get(
  '/users',
  validate({ query: userListQuerySchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await adminService.listUsers(req.query as any);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/v1/admin/users/:id
 * Individual user details with profiles, devices, productivity metrics and activity
 */
adminRouter.get(
  '/users/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await adminService.getUserDetails(req.params.id);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * PATCH /api/v1/admin/users/:id/status
 * Activate or deactivate a user account with session invalidation
 */
adminRouter.patch(
  '/users/:id/status',
  validate({ body: userStatusUpdateSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await adminService.updateUserStatus(
        req.userId!,
        req.params.id,
        req.body,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * PATCH /api/v1/admin/users/:id/role
 * Promote or demote user role (guarded against self-demotion & last-admin removal)
 */
adminRouter.patch(
  '/users/:id/role',
  validate({ body: userRoleUpdateSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await adminService.updateUserRole(req.userId!, req.params.id, req.body.role);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/v1/admin/categories
 * List custom category and domain classification rules
 */
adminRouter.get(
  '/categories',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await adminService.listCategories(req.query as any);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/v1/admin/categories
 * Create a new domain/app classification rule
 */
adminRouter.post(
  '/categories',
  validate({ body: categoryCreateSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await adminService.createCategory(req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * PATCH /api/v1/admin/categories/:id
 * Update an existing domain/app classification rule
 */
adminRouter.patch(
  '/categories/:id',
  validate({ body: categoryUpdateSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await adminService.updateCategory(req.params.id, req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * DELETE /api/v1/admin/categories/:id
 * Delete a category rule
 */
adminRouter.delete(
  '/categories/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await adminService.deleteCategory(req.params.id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/v1/admin/audit-logs
 * Telemetry log feed of model inferences, smart alerts, and recommendations
 */
adminRouter.get(
  '/audit-logs',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await adminService.getAuditLogs();
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  },
);

