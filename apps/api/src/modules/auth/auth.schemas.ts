import { z } from 'zod';

export const registerSchema = z
  .object({
    email: z.string().trim().email('Invalid email address'),
    password: z
      .string()
      .min(10, 'Password must be at least 10 characters')
      .max(128, 'Password must not exceed 128 characters'),
    displayName: z.string().trim().min(1, 'Display name is required'),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().trim().email('Invalid email address'),
    password: z
      .string()
      .min(10, 'Password must be at least 10 characters')
      .max(128, 'Password must not exceed 128 characters'),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
