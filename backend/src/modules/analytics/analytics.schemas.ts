import { z } from 'zod';

export const analyticsQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional(),
});

export const analyticsRangeQuerySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'from must be in YYYY-MM-DD format')
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'to must be in YYYY-MM-DD format')
    .optional(),
});

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
export type AnalyticsRangeQuery = z.infer<typeof analyticsRangeQuerySchema>;

export const simulatePredictionSchema = z.object({
  appName: z.string().min(1).default('Visual Studio Code'),
  category: z.enum(['productive', 'social', 'communication', 'entertainment', 'other']).default('productive'),
  hoursUsed: z.coerce.number().min(0.01).max(24).default(1.5),
  dayUsed: z.string().default('Wednesday'),
  numberEvents: z.coerce.number().int().min(0).default(50),
  numberInteractions: z.coerce.number().int().min(0).default(1000),
  switches: z.coerce.number().int().min(0).default(5),
  eventSpan: z.coerce.number().min(1).default(90),
});

export type SimulatePredictionInput = z.infer<typeof simulatePredictionSchema>;
