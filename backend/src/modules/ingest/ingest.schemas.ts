import { z } from 'zod';

function isValidTimestamp(val: string): boolean {
  const d = new Date(val);
  const time = d.getTime();
  if (Number.isNaN(time)) return false;
  const now = Date.now();
  const minTime = now - 7 * 24 * 60 * 60 * 1000 - 1000;
  const maxTime = now + 5 * 60 * 1000 + 1000;
  return time >= minTime && time <= maxTime;
}

const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/;
export const desktopAppRegex = /^[a-z0-9][a-z0-9 ._-]{0,63}$/;

export const browserActivityEventSchema = z
  .object({
    clientEventId: z.string().min(1).max(64),
    source: z.literal('browser').optional().default('browser'),
    domain: z
      .string()
      .trim()
      .toLowerCase()
      .max(253)
      .regex(domainRegex, 'Invalid domain format'),
    startedAt: z.string().refine(isValidTimestamp, {
      message: 'Timestamp must not be older than 7 days or more than 5 minutes in the future',
    }),
    endedAt: z.string().refine(isValidTimestamp, {
      message: 'Timestamp must not be older than 7 days or more than 5 minutes in the future',
    }),
    idle: z.boolean(),
  })
  .strict()
  .refine(
    (e) => new Date(e.startedAt).getTime() < new Date(e.endedAt).getTime(),
    { message: 'startedAt must be before endedAt', path: ['endedAt'] },
  )
  .refine(
    (e) => (new Date(e.endedAt).getTime() - new Date(e.startedAt).getTime()) / 1000 <= 86400,
    { message: 'Duration must be less than or equal to 86400 seconds', path: ['endedAt'] },
  );

export const desktopActivityEventSchema = z
  .object({
    clientEventId: z.string().min(1).max(64),
    source: z.literal('desktop').optional().default('desktop'),
    app: z
      .string()
      .regex(desktopAppRegex, 'Invalid app format'),
    startedAt: z.string().refine(isValidTimestamp, {
      message: 'Timestamp must not be older than 7 days or more than 5 minutes in the future',
    }),
    endedAt: z.string().refine(isValidTimestamp, {
      message: 'Timestamp must not be older than 7 days or more than 5 minutes in the future',
    }),
    idle: z.boolean(),
  })
  .strict()
  .refine(
    (e) => new Date(e.startedAt).getTime() < new Date(e.endedAt).getTime(),
    { message: 'startedAt must be before endedAt', path: ['endedAt'] },
  )
  .refine(
    (e) => (new Date(e.endedAt).getTime() - new Date(e.startedAt).getTime()) / 1000 <= 86400,
    { message: 'Duration must be less than or equal to 86400 seconds', path: ['endedAt'] },
  );

export const activityEventSchema = z.union([
  desktopActivityEventSchema,
  browserActivityEventSchema,
]);

export const ingestActivitySchema = z
  .object({
    events: z.array(activityEventSchema).min(1).max(500),
  })
  .strict();

export const switchEventSchema = z
  .object({
    clientEventId: z.string().min(1).max(64),
    fromApp: z.string().min(1).max(253),
    toApp: z.string().min(1).max(253),
    switchedAt: z.string().refine(isValidTimestamp, {
      message: 'Timestamp must not be older than 7 days or more than 5 minutes in the future',
    }),
  })
  .strict();

export const ingestSwitchesSchema = z
  .object({
    events: z.array(switchEventSchema).min(1).max(500),
  })
  .strict();

export const notificationEventSchema = z
  .object({
    clientEventId: z.string().min(1).max(64),
    sourceApp: z.string().min(1).max(253),
    receivedAt: z.string().refine(isValidTimestamp, {
      message: 'Timestamp must not be older than 7 days or more than 5 minutes in the future',
    }),
  })
  .strict();

export const ingestNotificationsSchema = z
  .object({
    events: z.array(notificationEventSchema).min(1).max(500),
  })
  .strict();

export type BrowserActivityEvent = z.infer<typeof browserActivityEventSchema>;
export type DesktopActivityEvent = z.infer<typeof desktopActivityEventSchema>;
export type ActivityEvent = z.infer<typeof activityEventSchema>;
export type IngestActivityInput = z.infer<typeof ingestActivitySchema>;
export type IngestSwitchesInput = z.infer<typeof ingestSwitchesSchema>;
export type IngestNotificationsInput = z.infer<typeof ingestNotificationsSchema>;
