import crypto from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import {
  dummyVerifyPassword,
  generateAccessToken,
  generateRefreshToken,
  hashPassword,
  hashToken,
  verifyPassword,
} from '../../lib/security.js';
import { logger } from '../../lib/logger.js';
import { env } from '../../config/env.js';
import type { LoginInput, RegisterInput } from './auth.schemas.js';

function getRefreshTokenExpiry(): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.REFRESH_TTL_DAYS);
  return expiresAt;
}

export const authService = {
  async register(input: RegisterInput) {
    const email = input.email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { email },
    });
    if (existing) {
      throw new AppError(409, 'CONFLICT', 'Email already registered');
    }

    const passwordHash = await hashPassword(input.password);

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: 'user',
          profile: {
            create: {
              displayName: input.displayName.trim(),
            },
          },
        },
      });
      return createdUser;
    });

    const rawRefreshToken = generateRefreshToken();
    const tokenHash = hashToken(rawRefreshToken);
    const familyId = crypto.randomUUID();

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        familyId,
        tokenHash,
        expiresAt: getRefreshTokenExpiry(),
      },
    });

    const accessToken = await generateAccessToken(user.id, (user as any).role || 'user');

    return {
      accessToken,
      user: { id: user.id, email: user.email, role: (user as any).role || 'user' },
      refreshToken: rawRefreshToken,
    };
  },

  async login(input: LoginInput) {
    const email = input.email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      await dummyVerifyPassword();
      logger.warn({ email }, 'Login failure: user not found');
      throw new AppError(401, 'UNAUTHENTICATED', 'Invalid email or password');
    }

    const isValid = await verifyPassword(input.password, user.passwordHash);
    if (!isValid) {
      logger.warn({ email, userId: user.id }, 'Login failure: incorrect password');
      throw new AppError(401, 'UNAUTHENTICATED', 'Invalid email or password');
    }

    if ((user as any).isActive === false) {
      logger.warn({ email, userId: user.id }, 'Login failure: account deactivated');
      throw new AppError(
        403,
        'FORBIDDEN',
        'This account has been deactivated by an administrator. Please contact platform support.',
      );
    }

    const chosenRole = input.intendedRole || input.selectedRole;
    const dbRole = (user as any).role || 'user';

    if (chosenRole) {
      if (chosenRole === 'admin' && dbRole !== 'admin') {
        logger.warn({ email, chosenRole, dbRole }, 'Role mismatch: user attempted admin login');
        throw new AppError(
          403,
          'FORBIDDEN',
          'You selected Admin Login, but this account is not registered as an administrator.',
        );
      }
      // Admins are full users with elevated privileges and can log in under both User and Admin modes
    }

    const rawRefreshToken = generateRefreshToken();
    const tokenHash = hashToken(rawRefreshToken);
    const familyId = crypto.randomUUID();

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        familyId,
        tokenHash,
        expiresAt: getRefreshTokenExpiry(),
      },
    });

    const accessToken = await generateAccessToken(user.id, dbRole);

    return {
      accessToken,
      user: { id: user.id, email: user.email, role: dbRole },
      refreshToken: rawRefreshToken,
    };
  },

  async refresh(rawToken: string | undefined) {
    if (!rawToken) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Missing refresh token');
    }

    const tokenHash = hashToken(rawToken);

    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!storedToken) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Invalid refresh token');
    }

    if (Boolean(storedToken.revokedAt)) {
      // Refresh token reuse detected! Revoke the whole family
      await prisma.refreshToken.updateMany({
        where: { familyId: storedToken.familyId },
        data: { revokedAt: new Date() },
      });
      logger.warn(
        { userId: storedToken.userId, familyId: storedToken.familyId },
        'Refresh token reuse detected; family revoked',
      );
      throw new AppError(401, 'UNAUTHENTICATED', 'Refresh token reused, session revoked');
    }

    if (storedToken.expiresAt < new Date()) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Refresh token expired');
    }

    const newRawRefreshToken = generateRefreshToken();
    const newTokenHash = hashToken(newRawRefreshToken);

    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() },
      }),
      prisma.refreshToken.create({
        data: {
          userId: storedToken.userId,
          familyId: storedToken.familyId,
          tokenHash: newTokenHash,
          expiresAt: getRefreshTokenExpiry(),
        },
      }),
    ]);

    const user = await prisma.user.findUnique({
      where: { id: storedToken.userId },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!user || (user as any).isActive === false) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Account is invalid or deactivated');
    }

    const userRole = (user as any)?.role || 'user';

    const accessToken = await generateAccessToken(storedToken.userId, userRole);

    return {
      accessToken,
      refreshToken: newRawRefreshToken,
      user: user ? { id: user.id, email: user.email, role: userRole } : undefined,
    };
  },

  async logout(rawToken: string | undefined) {
    if (rawToken) {
      const tokenHash = hashToken(rawToken);
      await prisma.refreshToken
        .update({
          where: { tokenHash },
          data: { revokedAt: new Date() },
        })
        .catch(() => {});
    }
  },
};
