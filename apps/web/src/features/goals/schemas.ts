import { z } from 'zod';

export const goalSchema = z.object({
  type: z.enum(['focus_minutes', 'max_screen_minutes', 'max_context_switches']),
  period: z.enum(['daily', 'weekly']),
  targetValue: z.coerce
    .number()
    .int('Target value must be an integer')
    .min(1, 'Target value must be at least 1')
    .max(10080, 'Target value must not exceed 10080'),
});

export type GoalFormValues = z.infer<typeof goalSchema>;
