import { z } from 'zod';

export const startFocusSessionSchema = z
  .object({
    plannedMin: z.number().int().min(5).max(480),
  })
  .strict();

export const stopFocusSessionSchema = z
  .object({
    status: z.enum(['completed', 'abandoned']),
  })
  .strict();

export const focusParamsSchema = z
  .object({
    id: z.string().uuid('Invalid focus session ID'),
  })
  .strict();

export const listFocusSessionsQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    cursor: z.string().optional(),
  })
  .strict();

export type StartFocusSessionInput = z.infer<typeof startFocusSessionSchema>;
export type StopFocusSessionInput = z.infer<typeof stopFocusSessionSchema>;
export type ListFocusSessionsQuery = z.infer<typeof listFocusSessionsQuerySchema>;
