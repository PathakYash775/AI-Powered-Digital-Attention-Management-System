import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const updateProfileSchema = z
  .object({
    displayName: z.string().trim().min(1, 'Display name cannot be empty').optional(),
    timezone: z
      .string()
      .refine(
        (tz) => {
          try {
            Intl.DateTimeFormat(undefined, { timeZone: tz });
            return true;
          } catch {
            return false;
          }
        },
        { message: 'Invalid IANA timezone' },
      )
      .optional(),
    occupationType: z.enum(['student', 'professional']).optional(),
    workStart: z.string().regex(timeRegex, 'workStart must be in HH:MM format').optional(),
    workEnd: z.string().regex(timeRegex, 'workEnd must be in HH:MM format').optional(),
  })
  .strict();

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
