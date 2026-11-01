import { z } from 'zod';

export const profileSchema = z.object({
  displayName: z.string().trim().min(1, 'Full name is required'),
  email: z.string().email('Valid email is required').optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
  timezone: z.string().min(1, 'Timezone is required'),
  occupationType: z.enum(['student', 'professional']),
  workStart: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Work start must be HH:mm'),
  workEnd: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Work end must be HH:mm'),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

