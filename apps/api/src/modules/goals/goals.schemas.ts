import { z } from 'zod';

export const goalTypeEnum = z.enum([
  'focus_minutes',
  'max_screen_minutes',
  'max_context_switches',
]);

export const goalPeriodEnum = z.enum(['daily', 'weekly']);

export const createGoalSchema = z
  .object({
    type: goalTypeEnum,
    period: goalPeriodEnum,
    targetValue: z.number().int().min(1).max(10080),
  })
  .strict();

export const updateGoalSchema = z
  .object({
    type: goalTypeEnum.optional(),
    period: goalPeriodEnum.optional(),
    targetValue: z.number().int().min(1).max(10080).optional(),
  })
  .strict();

export const goalParamsSchema = z
  .object({
    id: z.string().uuid('Invalid goal ID format'),
  })
  .strict();

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
