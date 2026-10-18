import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../lib/security.js';
import { AppError } from '../lib/errors.js';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(401, 'UNAUTHENTICATED', 'Missing or invalid access token'));
  }

  const token = authHeader.slice(7).trim();
  const verified = await verifyAccessToken(token);

  if (!verified) {
    return next(new AppError(401, 'UNAUTHENTICATED', 'Invalid or expired access token'));
  }

  req.userId = verified.userId;
  next();
}
