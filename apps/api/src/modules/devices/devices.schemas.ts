import { z } from 'zod';

export const pairDeviceSchema = z
  .object({
    code: z
      .string()
      .trim()
      .length(8, 'Pairing code must be 8 characters')
      .transform((val) => val.toUpperCase()),
    deviceName: z.string().trim().min(1, 'Device name is required').max(253),
    platform: z.enum(['chrome', 'windows', 'android']).default('chrome'),
    deviceIdentifier: z.string().trim().max(253).optional(),
    version: z.string().trim().max(64).optional(),
  })
  .strict();

export const deviceParamsSchema = z
  .object({
    id: z.string().uuid('Invalid device ID format'),
  })
  .strict();

export type PairDeviceInput = z.infer<typeof pairDeviceSchema>;
