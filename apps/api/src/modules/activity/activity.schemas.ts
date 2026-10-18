import { z } from 'zod';

export const activitySummaryQuerySchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  })
  .strict();

export const activityListQuerySchema = z
  .object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    cursor: z.string().optional(),
  })
  .strict()
  .refine(
    (q) => {
      if (q.from && q.to) {
        const fromTime = new Date(q.from).getTime();
        const toTime = new Date(q.to).getTime();
        if (fromTime > toTime) return false;
        const maxRangeMs = 90 * 24 * 60 * 60 * 1000;
        if (toTime - fromTime > maxRangeMs) return false;
      }
      return true;
    },
    { message: 'Invalid date range: max range is 90 days and from must be before to' },
  );

export type ActivitySummaryQuery = z.infer<typeof activitySummaryQuerySchema>;
export type ActivityListQuery = z.infer<typeof activityListQuerySchema>;
