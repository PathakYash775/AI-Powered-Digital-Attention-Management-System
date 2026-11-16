import { z } from 'zod';

export const userRoleUpdateSchema = z.object({
  role: z.enum(['user', 'admin']),
});

export const userStatusUpdateSchema = z.object({
  status: z.enum(['active', 'inactive', 'ACTIVE', 'INACTIVE']).optional(),
  isActive: z.boolean().optional(),
}).refine((data) => data.status !== undefined || data.isActive !== undefined, {
  message: 'Either status or isActive must be provided',
});

export const userListQuerySchema = z.object({
  search: z.string().optional(),
  role: z.string().optional(),
  status: z.string().optional(),
  sortBy: z.enum(['createdAt', 'email', 'displayName', 'lastActiveAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const categoryCreateSchema = z.object({
  kind: z.enum(['domain', 'app']).default('domain'),
  pattern: z.string().trim().min(1, 'Pattern is required').max(255),
  category: z.enum(['productive', 'social', 'communication', 'entertainment', 'other']),
});

export const categoryUpdateSchema = z.object({
  kind: z.enum(['domain', 'app']).optional(),
  pattern: z.string().trim().min(1).max(255).optional(),
  category: z.enum(['productive', 'social', 'communication', 'entertainment', 'other']).optional(),
});

