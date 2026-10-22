import { z } from 'zod';

export const activitySummaryQuerySchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  })
  .strict();

const dateOrDatetimeString = z
  .string()
  .refine(
    (val) => /^\d{4}-\d{2}-\d{2}$/.test(val) || !isNaN(Date.parse(val)),
    { message: 'Must be in YYYY-MM-DD or ISO 8601 datetime format' },
  );

export const activityListQuerySchema = z
  .object({
    from: dateOrDatetimeString.optional(),
    to: dateOrDatetimeString.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    cursor: z.string().optional(),
  })
  .strict()
  .refine(
    (q) => {
      if (q.from && q.to) {
        const fromTime = new Date(q.from.includes('T') ? q.from : `${q.from}T00:00:00.000Z`).getTime();
        const toTime = new Date(q.to.includes('T') ? q.to : `${q.to}T23:59:59.999Z`).getTime();
        if (fromTime > toTime) return false;
        const maxRangeMs = 91 * 24 * 60 * 60 * 1000;
        if (toTime - fromTime > maxRangeMs) return false;
      }
      return true;
    },
    { message: 'Invalid date range: max range is 90 days and from must be before to' },
  );

export type ActivitySummaryQuery = z.infer<typeof activitySummaryQuerySchema>;
export type ActivityListQuery = z.infer<typeof activityListQuerySchema>;
