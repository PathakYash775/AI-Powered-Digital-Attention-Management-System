import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const updateNotificationPreferencesSchema = z.object({
  distractionAlerts: z.boolean().optional(),
  breakReminders: z.boolean().optional(),
  focusSessionAlerts: z.boolean().optional(),
  weeklyReportAlerts: z.boolean().optional(),
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z.string().regex(timeRegex, 'Must be HH:mm').optional(),
  quietHoursEnd: z.string().regex(timeRegex, 'Must be HH:mm').optional(),
});

export const alertParamsSchema = z.object({
  id: z.string().uuid(),
});

export type UpdateNotificationPreferencesInput = z.infer<typeof updateNotificationPreferencesSchema>;

