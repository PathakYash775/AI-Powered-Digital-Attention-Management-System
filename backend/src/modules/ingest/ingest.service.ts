import type { Category } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import {
  collectAffectedDatesForActivity,
  getLocalDateString,
  recomputeUsageForDates,
} from '../usage/rollup.js';
import type {
  IngestActivityInput,
  IngestNotificationsInput,
  IngestSwitchesInput,
} from './ingest.schemas.js';

let categoriesCache: Array<{ pattern: string; category: Category }> | null = null;
let lastCacheTime = 0;

async function getDomainCategories(): Promise<Array<{ pattern: string; category: Category }>> {
  const now = Date.now();
  if (!categoriesCache || now - lastCacheTime > 60000) {
    categoriesCache = await prisma.domainCategory.findMany();
    lastCacheTime = now;
  }
  return categoriesCache;
}

export function matchDomainCategory(
  domain: string,
  categories: Array<{ pattern: string; category: Category }>,
): Category {
  let bestMatch: { pattern: string; category: Category } | null = null;
  for (const cat of categories) {
    if (domain === cat.pattern || domain.endsWith('.' + cat.pattern)) {
      if (!bestMatch || cat.pattern.length > bestMatch.pattern.length) {
        bestMatch = cat;
      }
    }
  }
  return bestMatch ? bestMatch.category : 'other';
}

export const ingestService = {
  async ingestActivity(userId: string, deviceId: string, input: IngestActivityInput) {
    const categories = await getDomainCategories();

    const records = input.events.map((e) => {
      const startedAt = new Date(e.startedAt);
      const endedAt = new Date(e.endedAt);
      const durationSec = Math.round((endedAt.getTime() - startedAt.getTime()) / 1000);
      const category = matchDomainCategory(e.domain, categories);

      return {
        userId,
        deviceId,
        clientEventId: e.clientEventId,
        domain: e.domain,
        category,
        startedAt,
        endedAt,
        durationSec,
        idle: e.idle,
      };
    });

    const result = await prisma.activityLog.createMany({
      data: records,
      skipDuplicates: true,
    });

    const received = records.length;
    const inserted = result.count;
    const duplicates = received - inserted;

    if (inserted > 0) {
      const profile = await prisma.profile.findUnique({
        where: { userId },
        select: { timezone: true },
      });
      const tz = profile?.timezone ?? 'UTC';
      const affectedDates = collectAffectedDatesForActivity(records, tz);
      await recomputeUsageForDates(userId, affectedDates);
    }

    return { received, inserted, duplicates };
  },

  async ingestSwitches(userId: string, deviceId: string, input: IngestSwitchesInput) {
    const records = input.events.map((e) => ({
      userId,
      deviceId,
      clientEventId: e.clientEventId,
      fromApp: e.fromApp,
      toApp: e.toApp,
      switchedAt: new Date(e.switchedAt),
    }));

    const result = await prisma.contextSwitch.createMany({
      data: records,
      skipDuplicates: true,
    });

    const received = records.length;
    const inserted = result.count;
    const duplicates = received - inserted;

    if (inserted > 0) {
      const profile = await prisma.profile.findUnique({
        where: { userId },
        select: { timezone: true },
      });
      const tz = profile?.timezone ?? 'UTC';
      const affectedDates = Array.from(
        new Set(records.map((r) => getLocalDateString(r.switchedAt, tz))),
      );
      await recomputeUsageForDates(userId, affectedDates);
    }

    return { received, inserted, duplicates };
  },

  async ingestNotifications(userId: string, deviceId: string, input: IngestNotificationsInput) {
    const records = input.events.map((e) => ({
      userId,
      deviceId,
      clientEventId: e.clientEventId,
      sourceApp: e.sourceApp,
      receivedAt: new Date(e.receivedAt),
    }));

    const result = await prisma.notificationEvent.createMany({
      data: records,
      skipDuplicates: true,
    });

    const received = records.length;
    const inserted = result.count;
    const duplicates = received - inserted;

    if (inserted > 0) {
      const profile = await prisma.profile.findUnique({
        where: { userId },
        select: { timezone: true },
      });
      const tz = profile?.timezone ?? 'UTC';
      const affectedDates = Array.from(
        new Set(records.map((r) => getLocalDateString(r.receivedAt, tz))),
      );
      await recomputeUsageForDates(userId, affectedDates);
    }

    return { received, inserted, duplicates };
  },

  heartbeat() {
    return { serverTime: new Date().toISOString() };
  },
};
