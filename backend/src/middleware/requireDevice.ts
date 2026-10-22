import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { hashToken } from '../lib/security.js';
import { AppError } from '../lib/errors.js';

declare global {
  namespace Express {
    interface Request {
      device?: {
        id: string;
        userId: string;
      };
    }
  }
}

export async function requireDevice(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer atn_')) {
    if (process.env.NODE_ENV === 'development') {
      const explicitUserId = req.headers['x-user-id'] as string | undefined;
      const devDevice = (explicitUserId
        ? await prisma.device.findFirst({
            where: { revokedAt: null, userId: explicitUserId },
            orderBy: { createdAt: 'desc' },
          })
        : null) ||
        await prisma.device.findFirst({
          where: { revokedAt: null, user: { email: 'yashpathak086@gmail.com' } },
          orderBy: { createdAt: 'desc' },
        }) ||
        await prisma.device.findFirst({
          where: { revokedAt: null },
          orderBy: { createdAt: 'desc' },
        });
      if (devDevice) {
        req.device = {
          id: devDevice.id,
          userId: devDevice.userId,
        };
        return next();
      }
    }
    return next(new AppError(401, 'UNAUTHENTICATED', 'Missing or invalid device token'));
  }

  const rawToken = authHeader.slice(7).trim();
  const tokenHash = hashToken(rawToken);

  const device = await prisma.device.findUnique({
    where: { tokenHash },
  });

  if (!device || Boolean(device.revokedAt)) {
    return next(new AppError(401, 'UNAUTHENTICATED', 'Invalid or revoked device token'));
  }

  // Update lastSeenAt asynchronously
  prisma.device
    .update({
      where: { id: device.id },
      data: { lastSeenAt: new Date() },
    })
    .catch(() => {});

  req.device = {
    id: device.id,
    userId: device.userId,
  };

  next();
}
