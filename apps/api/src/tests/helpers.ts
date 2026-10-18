import crypto from 'node:crypto';
import request from 'supertest';
import { app } from '../app.js';
import { prisma } from '../lib/prisma.js';
import type { Category } from '@prisma/client';
import { generateAccessToken, hashPassword, hashToken } from '../lib/security.js';

let isDbConnected: boolean | null = null;

const initialCategories: Array<{ id: string; pattern: string; category: Category }> = [
  { id: '1', pattern: 'youtube.com', category: 'entertainment' },
  { id: '2', pattern: 'netflix.com', category: 'entertainment' },
  { id: '3', pattern: 'instagram.com', category: 'social' },
  { id: '4', pattern: 'facebook.com', category: 'social' },
  { id: '5', pattern: 'x.com', category: 'social' },
  { id: '6', pattern: 'twitter.com', category: 'social' },
  { id: '7', pattern: 'reddit.com', category: 'social' },
  { id: '8', pattern: 'web.whatsapp.com', category: 'communication' },
  { id: '9', pattern: 'slack.com', category: 'communication' },
  { id: '10', pattern: 'discord.com', category: 'communication' },
  { id: '11', pattern: 'teams.microsoft.com', category: 'communication' },
  { id: '12', pattern: 'mail.google.com', category: 'communication' },
  { id: '13', pattern: 'github.com', category: 'productive' },
  { id: '14', pattern: 'stackoverflow.com', category: 'productive' },
  { id: '15', pattern: 'developer.mozilla.org', category: 'productive' },
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
      continue;
    }
    if (item[key] !== val) return false;
  }
  return true;
}

function selectFields(
  item: ModelRecord,
  select?: Record<string, boolean>,
): ModelRecord {
  if (!select) return { ...item };
  const res: ModelRecord = {};
  for (const [k, v] of Object.entries(select)) {
    if (v) res[k] = item[k];
  }
  return res;
}

function createModelHandler(collectionName: keyof Store, pkFields: string[] = ['id']) {
  return {
    async findUnique(args: { where: Record<string, unknown>; select?: Record<string, boolean> }) {
      const items = memStore[collectionName];
      let targetWhere = args.where;
      for (const [, v] of Object.entries(args.where)) {
        if (v && typeof v === 'object' && !(v instanceof Date)) {
          targetWhere = v as Record<string, unknown>;
        }
      }
      const found = items.find((it) => matchesWhere(it, targetWhere));
      return found ? selectFields(found, args.select) : null;
    },
    async findFirst(args: { where?: Record<string, unknown>; select?: Record<string, boolean> }) {
      const items = memStore[collectionName];
      const matched = args.where ? items.filter((it) => matchesWhere(it, args.where as Record<string, unknown>)) : items;
      const found = matched[0];
      return found ? selectFields(found, args.select) : null;
    },
    async findMany(args?: {
      where?: Record<string, unknown>;
      select?: Record<string, boolean>;
      orderBy?: Array<Record<string, 'asc' | 'desc'>>;
      take?: number;
    }) {
      const items = memStore[collectionName];
      let matched = args?.where ? items.filter((it) => matchesWhere(it, args.where as Record<string, unknown>)) : [...items];
      if (args?.orderBy && Array.isArray(args.orderBy)) {
        matched.sort((a, b) => {
          for (const order of args.orderBy as Array<Record<string, 'asc' | 'desc'>>) {
            const entry = Object.entries(order)[0];
            if (!entry) continue;
            const [k, dir] = entry;
            const valA = a[k] instanceof Date ? (a[k] as Date).getTime() : (a[k] as number | string);
            const valB = b[k] instanceof Date ? (b[k] as Date).getTime() : (b[k] as number | string);
            if (valA < valB) return dir === 'asc' ? -1 : 1;
            if (valA > valB) return dir === 'asc' ? 1 : -1;
          }
          return 0;
        });
      }
      if (args?.take !== undefined) {
        matched = matched.slice(0, args.take);
      }
      return matched.map((it) => selectFields(it, args?.select));
    },
    async create(args: { data: Record<string, unknown>; select?: Record<string, boolean> }) {
      const items = memStore[collectionName];
      const newItem: ModelRecord = {
        id: args.data.id ?? crypto.randomUUID(),
        createdAt: new Date(),
        ...(collectionName === 'devices' && { revokedAt: null, lastSeenAt: null }),
        ...(collectionName === 'refreshTokens' && { revokedAt: null }),
        ...(collectionName === 'pairingCodes' && { usedAt: null }),
        ...(collectionName === 'focusSessions' && { endedAt: null }),
        ...args.data,
      };
      if (collectionName === 'users' && args.data.profile) {
        const profData = args.data.profile as { create?: { displayName: string } };
        if (profData.create) {
          memStore.profiles.push({
            userId: newItem.id,
            displayName: profData.create.displayName,
            timezone: 'UTC',
            occupationType: 'student',
            workStart: '09:00',
            workEnd: '17:00',
          });
        }
      }
      items.push(newItem);
      return selectFields(newItem, args.select);
    },
    async createMany(args: { data: Array<Record<string, unknown>>; skipDuplicates?: boolean }) {
      const items = memStore[collectionName];
      let inserted = 0;
      for (const d of args.data) {
        const isDup = pkFields.some(() => {
          if (
            collectionName === 'activityLogs' ||
            collectionName === 'contextSwitches' ||
            collectionName === 'notificationEvents'
          ) {
            return items.some((it) => it.deviceId === d.deviceId && it.clientEventId === d.clientEventId);
          }
          return false;
        });
        if (isDup && args.skipDuplicates) {
          continue;
        }
        items.push({
          id: d.id ?? crypto.randomUUID(),
          createdAt: new Date(),
          ...d,
        });
        inserted++;
      }
      return { count: inserted };
    },
    async update(args: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
      select?: Record<string, boolean>;
    }) {
      const items = memStore[collectionName];
      let targetWhere = args.where;
      for (const [, v] of Object.entries(args.where)) {
        if (v && typeof v === 'object' && !(v instanceof Date)) {
          targetWhere = v as Record<string, unknown>;
        }
      }
      const idx = items.findIndex((it) => matchesWhere(it, targetWhere));
      const target = items[idx];
      if (idx !== -1 && target) {
        const updated = { ...target, ...args.data };
        items[idx] = updated;
        return selectFields(updated, args.select);
      }
      return null;
    },
    async updateMany(args: { where: Record<string, unknown>; data: Record<string, unknown> }) {
      const items = memStore[collectionName];
      let count = 0;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it && matchesWhere(it, args.where)) {
          items[i] = { ...it, ...args.data };
          count++;
        }
      }
      return { count };
    },
    async upsert(args: {
      where: Record<string, unknown>;
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) {
      let targetWhere = args.where;
      for (const [, v] of Object.entries(args.where)) {
        if (v && typeof v === 'object' && !(v instanceof Date)) {
          targetWhere = v as Record<string, unknown>;
        }
      }
      const existing = await this.findUnique({ where: targetWhere });
      if (existing) {
        return this.update({ where: targetWhere, data: args.update });
      }
      return this.create({ data: args.create });
    },
    async delete(args: { where: Record<string, unknown> }) {
      const items = memStore[collectionName];
      const idx = items.findIndex((it) => matchesWhere(it, args.where));
      if (idx !== -1) {
        const removed = items.splice(idx, 1)[0];
        return removed;
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
        (it) => !matchesWhere(it, args.where as Record<string, unknown>),
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

export async function createTestDevice(userId: string, name = 'Test Chrome') {
  const rawToken = 'atn_' + crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashToken(rawToken);
  const device = await prisma.device.create({
    data: {
      userId,
      name,
      platform: 'chrome',
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
