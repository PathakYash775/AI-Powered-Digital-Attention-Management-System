import { z } from 'zod';

export const goalSchema = z
  .object({
    type: z.enum(['focus_minutes', 'max_screen_minutes', 'max_context_switches', 'custom']),
    customName: z.string().trim().max(100).optional(),
    period: z.enum(['daily', 'weekly']),
    targetValue: z.coerce
      .number()
      .int('Target value must be an integer')
      .min(1, 'Target value must be at least 1')
      .max(10080, 'Target value must not exceed 10080'),
  })
  .refine(
    (data) => {
      if (data.type === 'custom') {
        return Boolean(data.customName && data.customName.trim().length > 0);
      }
      return true;
    },
    {
      message: 'Goal name is required for custom goals',
      path: ['customName'],
    }
  );

export type GoalFormValues = z.infer<typeof goalSchema>;
