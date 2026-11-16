import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';

export async function requireAdmin(req: Request, _res: Response, next: NextFunction): Promise<void> {
  if (!req.userId) {
    return next(new AppError(401, 'UNAUTHENTICATED', 'Missing or invalid access token'));
  }

  // Validate directly from database for absolute authorization security
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { role: true, isActive: true },
  });

  if (!user || user.role !== 'admin' || (user as any).isActive === false) {
    return next(new AppError(403, 'FORBIDDEN', 'Access denied: active administrator privileges required'));
  }

  req.userRole = 'admin';
  next();
}

