import { z } from 'zod';

export const taskPriorityEnum = z.enum(['low', 'medium', 'high', 'urgent']);
export const taskStatusEnum = z.enum(['todo', 'in_progress', 'completed', 'cancelled']);

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  category: z.string().max(50).default('work'),
  priority: taskPriorityEnum.default('medium'),
  estimatedMinutes: z.number().int().min(1).max(1440).default(30),
  deadline: z.string().datetime().optional().nullable(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  category: z.string().max(50).optional(),
  priority: taskPriorityEnum.optional(),
  status: taskStatusEnum.optional(),
  estimatedMinutes: z.number().int().min(1).max(1440).optional(),
  deadline: z.string().datetime().optional().nullable(),
  order: z.number().int().optional(),
});

export const listTasksQuerySchema = z.object({
  status: taskStatusEnum.optional(),
  category: z.string().optional(),
  priority: taskPriorityEnum.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const taskParamsSchema = z.object({
  id: z.string().uuid(),
});

export const applyPrioritiesSchema = z.object({
  updates: z.array(
    z.object({
      id: z.string().uuid(),
      priority: taskPriorityEnum,
      order: z.number().int().optional(),
    })
  ),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
export type ApplyPrioritiesInput = z.infer<typeof applyPrioritiesSchema>;

