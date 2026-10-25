import crypto from 'node:crypto';
import request from 'supertest';
import { app } from '../app.js';
import { prisma } from '../lib/prisma.js';
import type { Category, CategoryKind } from '@prisma/client';
import { generateAccessToken, hashPassword, hashToken } from '../lib/security.js';
import { clearCategoriesCache } from '../modules/ingest/ingest.service.js';

let isDbConnected: boolean | null = null;

const initialCategories: Array<{ id: string; kind: CategoryKind; pattern: string; category: Category }> = [
  { id: '1', kind: 'domain', pattern: 'youtube.com', category: 'entertainment' },
  { id: '2', kind: 'domain', pattern: 'netflix.com', category: 'entertainment' },
  { id: '3', kind: 'domain', pattern: 'instagram.com', category: 'social' },
  { id: '4', kind: 'domain', pattern: 'facebook.com', category: 'social' },
  { id: '5', kind: 'domain', pattern: 'x.com', category: 'social' },
  { id: '6', kind: 'domain', pattern: 'twitter.com', category: 'social' },
  { id: '7', kind: 'domain', pattern: 'reddit.com', category: 'social' },
  { id: '8', kind: 'domain', pattern: 'web.whatsapp.com', category: 'communication' },
  { id: '9', kind: 'domain', pattern: 'slack.com', category: 'communication' },
  { id: '10', kind: 'domain', pattern: 'discord.com', category: 'communication' },
  { id: '11', kind: 'domain', pattern: 'teams.microsoft.com', category: 'communication' },
  { id: '12', kind: 'domain', pattern: 'mail.google.com', category: 'communication' },
  { id: '13', kind: 'domain', pattern: 'github.com', category: 'productive' },
  { id: '14', kind: 'domain', pattern: 'stackoverflow.com', category: 'productive' },
  { id: '15', kind: 'domain', pattern: 'developer.mozilla.org', category: 'productive' },
  // app patterns
  { id: '101', kind: 'app', pattern: 'code', category: 'productive' },
  { id: '102', kind: 'app', pattern: 'cursor', category: 'productive' },
  { id: '103', kind: 'app', pattern: 'windowsterminal', category: 'productive' },
  { id: '104', kind: 'app', pattern: 'notepad', category: 'productive' },
  { id: '105', kind: 'app', pattern: 'winword', category: 'productive' },
  { id: '106', kind: 'app', pattern: 'excel', category: 'productive' },
  { id: '107', kind: 'app', pattern: 'powerpnt', category: 'productive' },
  { id: '108', kind: 'app', pattern: 'figma', category: 'productive' },
  { id: '109', kind: 'app', pattern: 'whatsapp', category: 'communication' },
  { id: '110', kind: 'app', pattern: 'slack', category: 'communication' },
  { id: '111', kind: 'app', pattern: 'teams', category: 'communication' },
  { id: '112', kind: 'app', pattern: 'ms-teams', category: 'communication' },
  { id: '113', kind: 'app', pattern: 'discord', category: 'communication' },
  { id: '114', kind: 'app', pattern: 'outlook', category: 'communication' },
  { id: '115', kind: 'app', pattern: 'spotify', category: 'entertainment' },
  { id: '116', kind: 'app', pattern: 'vlc', category: 'entertainment' },
  { id: '117', kind: 'app', pattern: 'steam', category: 'entertainment' },
];

export async function checkDbConnection(): Promise<boolean> {
  if (isDbConnected !== null) return isDbConnected;
  try {
    await prisma.$queryRaw`SELECT 1`;
    isDbConnected = true;
  } catch {
    isDbConnected = false;
  }
  return isDbConnected;
}

type ModelRecord = Record<string, unknown>;

interface Store {
  users: ModelRecord[];
  profiles: ModelRecord[];
  refreshTokens: ModelRecord[];
  goals: ModelRecord[];
  devices: ModelRecord[];
  pairingCodes: ModelRecord[];
  domainCategories: ModelRecord[];
  activityLogs: ModelRecord[];
  contextSwitches: ModelRecord[];
  notificationEvents: ModelRecord[];
  focusSessions: ModelRecord[];
  dailyUsageStats: ModelRecord[];
  hourlyUsagePatterns: ModelRecord[];
}

const memStore: Store = {
  users: [],
  profiles: [],
  refreshTokens: [],
  goals: [],
  devices: [],
  pairingCodes: [],
  domainCategories: [...initialCategories],
  activityLogs: [],
  contextSwitches: [],
  notificationEvents: [],
  focusSessions: [],
  dailyUsageStats: [],
  hourlyUsagePatterns: [],
};

function matchesWhere(item: ModelRecord, where: Record<string, unknown>): boolean {
  for (const [key, val] of Object.entries(where)) {
    if (key === 'OR' && Array.isArray(val)) {
      const orMatched = val.some((subWhere) =>
        matchesWhere(item, subWhere as Record<string, unknown>),
      );
      if (!orMatched) return false;
      continue;
    }
    if (val === null) {
      if (item[key] !== null && item[key] !== undefined) return false;
      continue;
    }
    if (val !== null && typeof val === 'object') {
      if (val instanceof Date) {
        const itemVal = item[key] instanceof Date ? (item[key] as Date).getTime() : new Date(String(item[key])).getTime();
        if (itemVal !== val.getTime()) return false;
        continue;
      }
      const valObj = val as Record<string, unknown>;
      if ('gt' in valObj) {
        const itemVal = item[key] instanceof Date ? (item[key] as Date).getTime() : new Date(String(item[key])).getTime();
        const comp = valObj.gt instanceof Date ? (valObj.gt as Date).getTime() : new Date(String(valObj.gt)).getTime();
        if (!(itemVal > comp)) return false;
      }
      if ('gte' in valObj) {
        const itemVal = item[key] instanceof Date ? (item[key] as Date).getTime() : new Date(String(item[key])).getTime();
        const comp = valObj.gte instanceof Date ? (valObj.gte as Date).getTime() : new Date(String(valObj.gte)).getTime();
        if (!(itemVal >= comp)) return false;
      }
      if ('lt' in valObj) {
        const itemVal = item[key] instanceof Date ? (item[key] as Date).getTime() : new Date(String(item[key])).getTime();
        const comp = valObj.lt instanceof Date ? (valObj.lt as Date).getTime() : new Date(String(valObj.lt)).getTime();
        if (!(itemVal < comp)) return false;
      }
      if ('lte' in valObj) {
        const itemVal = item[key] instanceof Date ? (item[key] as Date).getTime() : new Date(String(item[key])).getTime();
        const comp = valObj.lte instanceof Date ? (valObj.lte as Date).getTime() : new Date(String(valObj.lte)).getTime();
        if (!(itemVal <= comp)) return false;
      }
      if ('not' in valObj) {
        if (item[key] === valObj.not) return false;
      }
      continue;
    }
    if (item[key] !== val) {
      return false;
    }
  }
  return true;
}

function projectRecord(record: ModelRecord, select?: Record<string, unknown>): ModelRecord {
  if (!select) return { ...record };
  const res: ModelRecord = {};
  for (const [key, val] of Object.entries(select)) {
    if (val === true) {
      res[key] = record[key];
    } else if (typeof val === 'object' && val !== null) {
      if (key === 'user' && record['userId']) {
        const userRec = memStore.users.find((u) => u['id'] === record['userId']);
        res[key] = userRec ? projectRecord(userRec, (val as Record<string, unknown>).select as Record<string, unknown>) : null;
      } else if (key === 'device' && record['deviceId']) {
        const devRec = memStore.devices.find((d) => d['id'] === record['deviceId']);
        res[key] = devRec ? projectRecord(devRec, (val as Record<string, unknown>).select as Record<string, unknown>) : null;
      }
    }
  }
  return res;
}

function createModelHandler(collectionName: keyof Store, _idKeys: string[] = ['id']) {
  return {
    async findUnique(args: { where: Record<string, unknown>; select?: Record<string, unknown> }) {
      const found = memStore[collectionName].find((it) => {
        const where = args.where;
        for (const [key, val] of Object.entries(where)) {
          if (key.includes('_')) {
            const composite = val as Record<string, unknown>;
            for (const [cKey, cVal] of Object.entries(composite)) {
              if (it[cKey] !== cVal) return false;
            }
            continue;
          }
          if (it[key] !== val) return false;
        }
        return true;
      });
      return found ? projectRecord(found, args.select) : null;
    },
    async findFirst(args?: {
      where?: Record<string, unknown>;
      orderBy?: Record<string, 'asc' | 'desc'> | Array<Record<string, 'asc' | 'desc'>>;
      select?: Record<string, unknown>;
    }) {
      let list = [...memStore[collectionName]];
      if (args?.where) {
        list = list.filter((it) => matchesWhere(it, args.where!));
      }
      if (args?.orderBy) {
        const orders = Array.isArray(args.orderBy) ? args.orderBy : [args.orderBy];
        list.sort((a, b) => {
          for (const order of orders) {
            const [field, dir] = Object.entries(order)[0]!;
            const valA = a[field] instanceof Date ? (a[field] as Date).getTime() : a[field];
            const valB = b[field] instanceof Date ? (b[field] as Date).getTime() : b[field];
            if (valA !== valB) {
              const comp = (valA ?? 0) > (valB ?? 0) ? 1 : -1;
              return dir === 'desc' ? -comp : comp;
            }
          }
          return 0;
        });
      }
      return list[0] ? projectRecord(list[0], args?.select) : null;
    },
    async findMany(args?: {
      where?: Record<string, unknown>;
      orderBy?: Record<string, 'asc' | 'desc'> | Array<Record<string, 'asc' | 'desc'>>;
      select?: Record<string, unknown>;
      take?: number;
    }) {
      let list = [...memStore[collectionName]];
      if (args?.where) {
        list = list.filter((it) => matchesWhere(it, args.where!));
      }
      if (args?.orderBy) {
        const orders = Array.isArray(args.orderBy) ? args.orderBy : [args.orderBy];
        list.sort((a, b) => {
          for (const order of orders) {
            const [field, dir] = Object.entries(order)[0]!;
            const valA = a[field] instanceof Date ? (a[field] as Date).getTime() : a[field];
            const valB = b[field] instanceof Date ? (b[field] as Date).getTime() : b[field];
            if (valA !== valB) {
              const comp = (valA ?? 0) > (valB ?? 0) ? 1 : -1;
              return dir === 'desc' ? -comp : comp;
            }
          }
          return 0;
        });
      }
      if (args?.take !== undefined) {
        list = list.slice(0, args.take);
      }
      return list.map((it) => projectRecord(it, args?.select));
    },
    async create(args: { data: Record<string, unknown>; select?: Record<string, unknown> }) {
      const record = { ...args.data };
      if (!record['id']) {
        record['id'] = crypto.randomUUID();
      }
      if (!record['createdAt']) {
        record['createdAt'] = new Date();
      }
      memStore[collectionName].push(record);
      return projectRecord(record, args.select);
    },
    async createMany(args: { data: Array<Record<string, unknown>>; skipDuplicates?: boolean }) {
      let count = 0;
      for (const item of args.data) {
        const record = { ...item };
        if (!record['id']) {
          record['id'] = crypto.randomUUID();
        }
        if (args.skipDuplicates) {
          const isDup = memStore[collectionName].some((it) => {
            if (collectionName === 'activityLogs') {
              return it['deviceId'] === record['deviceId'] && it['clientEventId'] === record['clientEventId'];
            }
            if (collectionName === 'contextSwitches') {
              return it['deviceId'] === record['deviceId'] && it['clientEventId'] === record['clientEventId'];
            }
            if (collectionName === 'notificationEvents') {
              return it['deviceId'] === record['deviceId'] && it['clientEventId'] === record['clientEventId'];
            }
            return false;
          });
          if (isDup) continue;
        }
        memStore[collectionName].push(record);
        count++;
      }
      return { count };
    },
    async update(args: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
      select?: Record<string, unknown>;
    }) {
      const idx = memStore[collectionName].findIndex((it) => matchesWhere(it, args.where));
      if (idx !== -1) {
        const updated = { ...memStore[collectionName][idx], ...args.data };
        memStore[collectionName][idx] = updated;
        return projectRecord(updated, args.select);
      }
      return null;
    },
    async upsert(args: {
      where: Record<string, unknown>;
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) {
      const idx = memStore[collectionName].findIndex((it) => {
        for (const [key, val] of Object.entries(args.where)) {
          if (key.includes('_')) {
            const composite = val as Record<string, unknown>;
            for (const [cKey, cVal] of Object.entries(composite)) {
              if (it[cKey] !== cVal) return false;
            }
            continue;
          }
          if (it[key] !== val) return false;
        }
        return true;
      });
      if (idx !== -1) {
        const updated = { ...memStore[collectionName][idx], ...args.update };
        memStore[collectionName][idx] = updated;
        return updated;
      }
      const record = { ...args.create };
      if (!record['id']) {
        record['id'] = crypto.randomUUID();
      }
      memStore[collectionName].push(record);
      return record;
    },
    async delete(args: { where: Record<string, unknown> }) {
      const idx = memStore[collectionName].findIndex((it) => matchesWhere(it, args.where));
      if (idx !== -1) {
        const deleted = memStore[collectionName].splice(idx, 1)[0];
        return deleted;
      }
      return null;
    },
    async deleteMany(args?: { where?: Record<string, unknown> }) {
      if (!args?.where) {
        const count = memStore[collectionName].length;
        memStore[collectionName] = [];
        return { count };
      }
      const before = memStore[collectionName].length;
      memStore[collectionName] = memStore[collectionName].filter(
        (it) => !matchesWhere(it, args.where!),
      );
      return { count: before - memStore[collectionName].length };
    },
    async count(args?: { where?: Record<string, unknown> }) {
      if (!args?.where) return memStore[collectionName].length;
      return memStore[collectionName].filter((it) =>
        matchesWhere(it, args.where as Record<string, unknown>),
      ).length;
    },
  };
}

export function patchPrismaWithMemoryStore(): void {
  const p = prisma as unknown as Record<string, unknown>;
  p.user = createModelHandler('users');
  p.profile = createModelHandler('profiles', ['userId']);
  p.refreshToken = createModelHandler('refreshTokens');
  p.goal = createModelHandler('goals');
  p.device = createModelHandler('devices');
  p.pairingCode = createModelHandler('pairingCodes');
  p.domainCategory = createModelHandler('domainCategories');
  p.activityLog = createModelHandler('activityLogs');
  p.contextSwitch = createModelHandler('contextSwitches');
  p.notificationEvent = createModelHandler('notificationEvents');
  p.focusSession = createModelHandler('focusSessions');
  p.dailyUsageStat = createModelHandler('dailyUsageStats', ['userId', 'date']);
  p.hourlyUsagePattern = createModelHandler('hourlyUsagePatterns', ['userId', 'date', 'hour']);
  p.$transaction = async (arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: typeof prisma) => Promise<unknown>)(prisma);
    }
    if (Array.isArray(arg)) {
      return Promise.all(arg);
    }
    return undefined;
  };
}

export async function resetDatabase(): Promise<void> {
  clearCategoriesCache();
  const connected = await checkDbConnection();
  if (connected) {
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE "HourlyUsagePattern", "DailyUsageStat", "FocusSession",
      "NotificationEvent", "ContextSwitch", "ActivityLog", "PairingCode",
      "Device", "Goal", "RefreshToken", "Profile", "User" CASCADE;
    `);
    const count = await prisma.domainCategory.count();
    if (count === 0) {
      await prisma.domainCategory.createMany({
        data: initialCategories,
        skipDuplicates: true,
      });
    }
  } else {
    patchPrismaWithMemoryStore();
    memStore.users = [];
    memStore.profiles = [];
    memStore.refreshTokens = [];
    memStore.goals = [];
    memStore.devices = [];
    memStore.pairingCodes = [];
    memStore.domainCategories = [...initialCategories];
    memStore.activityLogs = [];
    memStore.contextSwitches = [];
    memStore.notificationEvents = [];
    memStore.focusSessions = [];
    memStore.dailyUsageStats = [];
    memStore.hourlyUsagePatterns = [];
  }
}

export async function createTestUser(
  email = 'test@example.com',
  password = 'Password123!',
  displayName = 'Test User',
) {
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      profile: {
        create: {
          displayName,
          timezone: 'UTC',
        },
      },
    },
    select: { id: true, email: true },
  });
  return { user, password };
}

export async function createTestDevice(
  userId: string,
  name = 'Test Chrome',
  platform: 'chrome' | 'windows' = 'chrome',
) {
  const rawToken = 'atn_' + crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashToken(rawToken);
  const device = await prisma.device.create({
    data: {
      userId,
      name,
      platform,
      tokenHash,
      lastSeenAt: null,
      revokedAt: null,
    },
    select: { id: true, name: true, platform: true, lastSeenAt: true, revokedAt: true },
  });
  return { device, token: rawToken };
}

export async function getAuthToken(userId: string): Promise<string> {
  return generateAccessToken(userId);
}

export function assertTestDatabase(): void {
  const url = process.env.DATABASE_URL ?? '';
  const dbNameMatch = url.match(/\/([^/?]+)(\?|$)/);
  const dbName = dbNameMatch ? dbNameMatch[1] : '';

  if (!dbName.endsWith('_test')) {
    throw new Error(
      `SAFETY VIOLATION: Tests must run against a database whose name ends with '_test'. Current: '${dbName}'`
    );
  }
}

export { request, app };
