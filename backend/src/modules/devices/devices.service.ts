import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import {
  generateDeviceToken,
  generatePairingCode,
  hashToken,
} from '../../lib/security.js';
import { logger } from '../../lib/logger.js';
import type { PairDeviceInput } from './devices.schemas.js';

export const devicesService = {
  async createPairingCode(userId: string) {
    const activeCount = await prisma.pairingCode.count({
      where: {
        userId,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (activeCount >= 5) {
      throw new AppError(409, 'CONFLICT', 'Maximum active pairing codes reached');
    }

    const code = generatePairingCode();
    const codeHash = hashToken(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.pairingCode.create({
      data: {
        userId,
        codeHash,
        expiresAt,
      },
    });

    logger.info({ userId }, 'Pairing code generated');

    return {
      code,
      expiresAt: expiresAt.toISOString(),
    };
  },

  async pairDevice(input: PairDeviceInput) {
    const codeHash = hashToken(input.code);

    return prisma.$transaction(async (tx) => {
      const codeRecord = await tx.pairingCode.findUnique({
        where: { codeHash },
      });

      if (!codeRecord || Boolean(codeRecord.usedAt) || codeRecord.expiresAt <= new Date()) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Invalid or expired pairing code');
      }

      await tx.pairingCode.update({
        where: { id: codeRecord.id },
        data: { usedAt: new Date() },
      });

      const rawDeviceToken = generateDeviceToken();
      const tokenHash = hashToken(rawDeviceToken);

      const device = await tx.device.create({
        data: {
          userId: codeRecord.userId,
          name: input.deviceName,
          platform: input.platform ?? 'chrome',
          tokenHash,
        },
        select: {
          id: true,
        },
      });

      logger.info({ deviceId: device.id, userId: codeRecord.userId }, 'Device paired successfully');

      return {
        deviceId: device.id,
        deviceToken: rawDeviceToken,
      };
    });
  },

  async getDevices(userId: string) {
    return prisma.device.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        platform: true,
        lastSeenAt: true,
        revokedAt: true,
      },
      orderBy: { id: 'asc' },
    });
  },

  async revokeDevice(userId: string, id: string) {
    const device = await prisma.device.findFirst({
      where: { id, userId },
    });

    if (!device) {
      throw new AppError(404, 'NOT_FOUND', 'Device not found');
    }

    await prisma.device.update({
      where: { id },
      data: { revokedAt: new Date() },
    });

    logger.info({ deviceId: id, userId }, 'Device revoked');
  },

  async getExtensionStatus(userId: string) {
    const activeDevice = await prisma.device.findFirst({
      where: { userId, revokedAt: null },
      orderBy: { lastSeenAt: 'desc' },
      select: { id: true, name: true, platform: true, lastSeenAt: true },
    });

    const isConnected = Boolean(activeDevice);
    const recentThreshold = new Date(Date.now() - 5 * 60 * 1000);
    const isRecentlyActive = Boolean(activeDevice?.lastSeenAt && activeDevice.lastSeenAt >= recentThreshold);
    void isRecentlyActive;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [activityCount, switchCount, lastActivity] = await Promise.all([
      prisma.activityLog.count({
        where: { userId, startedAt: { gte: todayStart } },
      }),
      prisma.contextSwitch.count({
        where: { userId, switchedAt: { gte: todayStart } },
      }),
      prisma.activityLog.findFirst({
        where: { userId },
        orderBy: { endedAt: 'desc' },
        select: { domain: true, appName: true, endedAt: true, durationSec: true },
      }),
    ]);

    return {
      connected: isConnected,
      activeDevice,
      todayStats: {
        activityCount,
        switchCount,
        lastDomain: lastActivity?.domain ?? lastActivity?.appName ?? null,
        lastEventAt: lastActivity?.endedAt ? lastActivity.endedAt.toISOString() : null,
      },
      extensionName: 'Digital Attention Tracker',
      version: '1.0.0',
      syncEndpoint: 'http://127.0.0.1:8000/api/activity',
    };
  },

  async autoLinkDevice(userId: string, deviceName = 'Digital Attention Tracker (Chrome)') {
    let device = await prisma.device.findFirst({
      where: { userId, name: deviceName, revokedAt: null },
    });

    if (!device) {
      const rawToken = generateDeviceToken();
      const tokenHash = hashToken(rawToken);
      device = await prisma.device.create({
        data: {
          userId,
          name: deviceName,
          platform: 'chrome',
          tokenHash,
          lastSeenAt: new Date(),
        },
      });
      return {
        deviceId: device.id,
        name: device.name,
        deviceToken: rawToken,
        created: true,
      };
    }

    await prisma.device.update({
      where: { id: device.id },
      data: { lastSeenAt: new Date() },
    });

    return {
      deviceId: device.id,
      name: device.name,
      created: false,
    };
  },
};
