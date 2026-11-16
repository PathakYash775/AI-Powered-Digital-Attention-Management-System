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
    const code = input.code.trim().toUpperCase();
    const codeHash = hashToken(code);

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
          lastSeenAt: new Date(),
        },
        select: {
          id: true,
          userId: true,
          name: true,
          platform: true,
          createdAt: true,
          lastSeenAt: true,
        },
      });

      logger.info({ deviceId: device.id, userId: codeRecord.userId }, 'Device paired successfully');

      return {
        deviceId: device.id,
        deviceToken: rawDeviceToken,
        deviceName: device.name,
        platform: device.platform,
        registeredAt: device.createdAt.toISOString(),
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
        createdAt: true,
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
    let activeDevice = await prisma.device.findFirst({
      where: { userId, platform: 'chrome', revokedAt: null },
      orderBy: { lastSeenAt: 'desc' },
      select: { id: true, name: true, platform: true, lastSeenAt: true, createdAt: true },
    });

    if (!activeDevice) {
      activeDevice = await prisma.device.findFirst({
        where: { userId, revokedAt: null },
        orderBy: { lastSeenAt: 'desc' },
        select: { id: true, name: true, platform: true, lastSeenAt: true, createdAt: true },
      });
    }

    const RECENT_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes threshold for real-time heartbeat / activity
    const isRecentlyActive = Boolean(
      activeDevice?.lastSeenAt &&
      Date.now() - new Date(activeDevice.lastSeenAt).getTime() <= RECENT_THRESHOLD_MS,
    );
    // Real status derived from recent successful communication
    const isConnected = isRecentlyActive;

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
      isRecentlyActive,
      lastActiveTime: activeDevice?.lastSeenAt ? activeDevice.lastSeenAt.toISOString() : null,
      registeredAt: activeDevice?.createdAt ? activeDevice.createdAt.toISOString() : null,
      activeDevice: activeDevice
        ? {
            id: activeDevice.id,
            name: activeDevice.name,
            platform: activeDevice.platform,
            lastSeenAt: activeDevice.lastSeenAt ? activeDevice.lastSeenAt.toISOString() : null,
          }
        : null,
      todayStats: {
        activityCount,
        switchCount,
        lastDomain: lastActivity?.domain ?? lastActivity?.appName ?? null,
        lastEventAt: lastActivity?.endedAt ? lastActivity.endedAt.toISOString() : null,
      },
      extensionName: 'Digital Attention Tracker',
      version: '1.0.0',
      syncEndpoint: '/api/v1/ingest/activity',
    };
  },

  async autoLinkDevice(
    userId: string,
    deviceName = 'Digital Attention Tracker (Chrome)',
    platform: 'chrome' | 'windows' | 'android' = 'chrome',
  ) {
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
          platform,
          tokenHash,
          lastSeenAt: new Date(),
        },
      });
      return {
        deviceId: device.id,
        name: device.name,
        platform: device.platform,
        deviceToken: rawToken,
        created: true,
      };
    }

    const rawToken = generateDeviceToken();
    const tokenHash = hashToken(rawToken);
    await prisma.device.update({
      where: { id: device.id },
      data: { lastSeenAt: new Date(), tokenHash },
    });

    return {
      deviceId: device.id,
      name: device.name,
      platform: device.platform,
      deviceToken: rawToken,
      created: false,
    };
  },
};
