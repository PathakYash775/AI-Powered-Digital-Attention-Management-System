import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';

function createLimiter(max: number, windowMs: number, message: string) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req: Request, res: Response) => {
      res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message,
        },
      });
    },
  });
}

export const globalLimiter = createLimiter(
  100,
  60 * 1000,
  'Too many requests from this IP. Please try again after a minute.'
);

export const authLimiter = createLimiter(
  10,
  60 * 1000,
  'Too many authentication attempts. Please try again after a minute.'
);

export const pairLimiter = createLimiter(
  10,
  60 * 1000,
  'Too many pairing attempts. Please try again after a minute.'
);

export const ingestLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Rate limit per device token if authenticated, else IP
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer atn_')) {
      return authHeader;
    }
    return req.ip ?? 'unknown';
  },
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Telemetry ingest rate limit exceeded (max 60/min per device).',
      },
    });
  },
});
