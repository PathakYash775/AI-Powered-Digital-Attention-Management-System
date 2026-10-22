export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export interface User {
  id: string;
  email: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface RefreshResponse {
  accessToken: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export type OccupationType = 'student' | 'professional';

export interface Profile {
  displayName: string;
  timezone: string;
  occupationType: OccupationType;
  workStart: string;
  workEnd: string;
}

export type GoalType = 'focus_minutes' | 'max_screen_minutes' | 'max_context_switches' | 'custom';
export type GoalPeriod = 'daily' | 'weekly';

export interface Goal {
  id: string;
  type: GoalType;
  period: GoalPeriod;
  targetValue: number;
  customName?: string | null;
}

export interface CreateGoalPayload {
  type: GoalType;
  period: GoalPeriod;
  targetValue: number;
  customName?: string | null;
}

export interface UpdateGoalPayload {
  type?: GoalType;
  period?: GoalPeriod;
  targetValue?: number;
  customName?: string | null;
}

export interface TopSite {
  name: string;
  durationSec: number;
  category?: SessionCategory;
}

export interface ActivitySummary {
  date: string;
  totalScreenSec: number;
  activeSec: number;
  idleSec: number;
  switchCount: number;
  notificationCount: number;
  topSites: TopSite[];
}

export interface HourlyUsageItem {
  hour: number;
  activeSec: number;
  idleSec: number;
  switchCount: number;
  notificationCount: number;
}

export interface FocusSessionItem {
  id: string;
  plannedMin: number;
  status: 'active' | 'completed' | 'abandoned';
  startedAt: string;
  endedAt: string | null;
  interruptionCount: number;
}

export interface ActivityReport {
  summary: ActivitySummary;
  hourlyPatterns: HourlyUsageItem[];
  categoryBreakdown: {
    productive: number;
    communication: number;
    entertainment: number;
    social: number;
    other: number;
  };
  focusSessions: FocusSessionItem[];
  goals: Goal[];
}

export type SessionCategory = 'productive' | 'social' | 'communication' | 'entertainment' | 'other';

export interface ActivitySession {
  id: string;
  domain: string;
  category: SessionCategory;
  startedAt: string;
  endedAt: string;
  durationSec: number;
  idle: boolean;
  appName?: string;
  siteName?: string;
  device?: {
    name: string;
    platform: string;
  };
}

export interface TaskSwitch {
  id: string;
  fromApp: string;
  toApp: string;
  fromAppName?: string;
  toAppName?: string;
  switchedAt: string;
  device?: {
    name: string;
    platform: string;
  };
}

export interface ActivityNotification {
  id: string;
  sourceApp: string;
  sourceAppName?: string;
  receivedAt: string;
  device?: {
    name: string;
    platform: string;
  };
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
}

export interface PaginationParams {
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string | null;
}

export interface DeviceItem {
  id: string;
  name: string;
  platform: 'chrome';
  lastSeenAt: string | null;
  revokedAt: string | null;
}

export interface PairingCodeResponse {
  code: string;
  expiresAt: string;
}

export interface ExtensionStatusResponse {
  connected: boolean;
  activeDevice: DeviceItem | null;
  todayStats: {
    activityCount: number;
    switchCount: number;
    lastDomain: string | null;
    lastEventAt: string | null;
  };
  extensionName: string;
  version: string;
  syncEndpoint: string;
}


