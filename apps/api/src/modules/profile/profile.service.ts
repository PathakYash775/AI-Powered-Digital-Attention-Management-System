import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import type { UpdateProfileInput } from './profile.schemas.js';

export const profileService = {
  async getProfile(userId: string) {
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: {
        displayName: true,
        timezone: true,
        occupationType: true,
        workStart: true,
        workEnd: true,
      },
    });

    if (!profile) {
      throw new AppError(404, 'NOT_FOUND', 'Profile not found');
    }

    return profile;
  },

  async updateProfile(userId: string, data: UpdateProfileInput) {
    const existing = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Profile not found');
    }

    const updated = await prisma.profile.update({
      where: { userId },
      data: {
        ...(data.displayName !== undefined && { displayName: data.displayName }),
        ...(data.timezone !== undefined && { timezone: data.timezone }),
        ...(data.occupationType !== undefined && { occupationType: data.occupationType }),
        ...(data.workStart !== undefined && { workStart: data.workStart }),
        ...(data.workEnd !== undefined && { workEnd: data.workEnd }),
      },
      select: {
        displayName: true,
        timezone: true,
        occupationType: true,
        workStart: true,
        workEnd: true,
      },
    });

    return updated;
  },
};
