export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export interface User {
  id: string;
  email: string;
  role?: 'user' | 'admin';
}

export interface AuthResponse {
  accessToken: string;
  user: User;
  refreshToken?: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken?: string;
  user?: User;
}

export interface RegisterPayload {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  intendedRole?: 'user' | 'admin';
  selectedRole?: 'user' | 'admin';
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
  topApps?: TopSite[];
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
  source?: 'browser' | 'desktop' | 'mobile';
  domain: string | null;
  appName?: string | null;
  category: SessionCategory;
  startedAt: string;
  endedAt: string;
  durationSec: number;
  idle: boolean;
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
  platform: 'chrome' | 'windows' | 'android';
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

export type RecommendationCategory =
  | 'focus_improvement'
  | 'productivity_tip'
  | 'attention_recovery'
  | 'pattern_optimization';

export type RecommendationStatus = 'pending' | 'accepted' | 'dismissed' | 'completed';

export interface Recommendation {
  id: string;
  userId: string;
  category: RecommendationCategory;
  title: string;
  description: string;
  reason: string;
  actionType?: string | null;
  actionPayload?: Record<string, unknown> | null;
  impactScore: number;
  status: RecommendationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface BehavioralAnalysisResponse {
  provider: 'gemini' | 'algorithmic_engine';
  behavioralDiagnosis: string;
  peakFocusWindow: string | {
    startHour: number;
    endHour: number;
    label: string;
    confidence: number;
  };
  peakFocusWindowDetails?: {
    startHour: number;
    endHour: number;
    label: string;
    confidence: number;
  };
  distractionRootCause: string;
  rootCause?: string;
  recommendations: Array<{
    category: RecommendationCategory;
    title: string;
    description: string;
    reason: string;
    actionType?: string;
    actionPayload?: Record<string, unknown>;
    impactScore: number;
  }>;
}

export interface SmartFocusPlan {
  optimalDuration: number;
  durationReason: string;
  breakSuggestion: {
    type: 'micro' | 'recharge' | 'deep_rest';
    durationMinutes: number;
    activity: string;
    reason: string;
  };
  highFocusWindows: Array<
    | string
    | {
        start?: string;
        end?: string;
        startHour?: number;
        endHour?: number;
        label?: string;
        confidenceScore?: number;
        confidence?: number;
      }
  >;
  taskPriorities: Array<
    | string
    | {
        goalId?: string;
        title: string;
        priority: string;
        suggestedBlockMin?: number;
        completedPercent?: number;
      }
  >;
  sessionsCompletedToday: number;
}

export interface HabitProgressResponse {
  currentStreak: number;
  longestStreak: number;
  weeklyCompletionRate: number;
  habitScore: number;
  historyDays: Array<{
    date: string;
    completed: number;
    totalGoals: number;
    percent: number;
  }>;
}

export interface NotificationPreferences {
  distractionAlerts: boolean;
  breakReminders: boolean;
  focusSessionAlerts: boolean;
  weeklyReportAlerts: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

export interface SmartAlert {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'urgent';
  read: boolean;
  createdAt: string;
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'cancelled';

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  category: string;
  priority: TaskPriority;
  status: TaskStatus;
  estimatedMinutes: number;
  deadline?: string | null;
  completedAt?: string | null;
  order: number;
  focusMinutesSpent?: number;
  sessionsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskStats {
  total: number;
  completed: number;
  completedToday: number;
  inProgress: number;
  todo: number;
  overdue: number;
  urgentOrHigh: number;
  completionRate: number;
  totalFocusMinutesSpent: number;
}

export interface PrioritizedTaskSuggestion {
  id: string;
  suggestedPriority: TaskPriority;
  recommendedOrder: number;
  reason: string;
}

export interface TaskPrioritizationResult {
  reasoning?: string;
  summary?: string;
  suggestions?: PrioritizedTaskSuggestion[];
  prioritizedTasks?: PrioritizedTaskSuggestion[];
}

export interface DailyBriefing {
  headline: string;
  briefing: string;
  summary?: string;
  highlights: string[];
  productivityRisks?: string[];
  risks?: string[];
  suggestedImprovements?: string[];
  suggestedFocusBlocks?: string[];
  provider?: string;
}

export interface WeeklyAiReport {
  summary: string;
  attentionTrends: string;
  productivityTrends: string;
  distractionPatterns: string;
  appObservations: string;
  actionPlan: string[];
  keyTrends?: string[];
  recommendations?: string[];
  provider?: string;
}

export interface FindingExplanation {
  explanation: string;
  behavioralFactors?: string[];
  recommendedRemedy?: string;
  actionableStep?: string;
  provider?: string;
}

export interface AssistantAnswer {
  answer: string;
  relevantMetrics?: Record<string, unknown>;
  groundedDataPoints?: string[];
  suggestions?: string[];
  provider?: string;
}

export interface ModelTransparencyInfo {
  serviceName: string;
  regressor: {
    modelName: string;
    version: string;
    algorithm: string;
    target: string;
    estimators: number;
    maxDepth?: number;
    evaluatedR2: number;
  };
  classifier: {
    modelName: string;
    version: string;
    algorithm: string;
    target: string;
    estimators: number;
    evaluatedAccuracy: number;
  };
  featureInputs: Array<{
    name: string;
    type: string;
    description: string;
  }>;
  generativeAi: {
    provider: string;
    status: string;
    capabilities: string[];
  };
  distinctions?: {
    calculatedMetrics: string[];
    ruleBasedFindings: string[];
    mlPredictions: string[];
  };
  mlMicroserviceStatus?: {
    status: string;
    endpoint?: string;
  };
  transparencyStatement: string;
}

export interface AdminOverviewMetrics {
  totalUsers: number;
  totalAdmins: number;
  activeUsers?: number;
  inactiveUsers?: number;
  active7d?: number;
  active30d?: number;
  totalDevices: number;
  activeDevices24h: number;
  totalSessions: number;
  sessions7d?: number;
  activeSessions: number;
  totalScreenSec: number;
  totalScreenMinutes: number;
  focusHours7d?: number;
  totalTasks: number;
  tasks7d?: number;
  activeGoals?: number;
  retentionRate7d?: number;
  retainedCount?: string;
  totalAlerts: number;
  totalRecommendations: number;
  totalRules: number;
  totalEvents?: number;
}

export interface AdminServiceHealth {
  database: { status: 'up' | 'down'; latencyMs: number };
  pythonMl: { status: 'up' | 'down'; url?: string };
  geminiAi: { status: 'up' | 'not_configured'; model: string };
  bridge: { status: 'active' | 'standby'; port: number; description: string };
}

export interface AdminCategoryDistribution {
  category: string;
  durationSec: number;
  count: number;
  percentage: number;
}

export interface AdminOverview {
  metrics: AdminOverviewMetrics;
  health: AdminServiceHealth;
  dailyTrends?: {
    registrations: Array<{ date: string; count: number }>;
    sessions: Array<{ date: string; count: number }>;
    tasks: Array<{ date: string; count: number }>;
  };
  categoryDistribution: AdminCategoryDistribution[];
}

export interface AdminUserItem {
  id: string;
  email: string;
  role: 'user' | 'admin';
  status: 'active' | 'inactive';
  isActive: boolean;
  displayName: string;
  createdAt: string;
  devicesCount: number;
  sessionsCount: number;
  tasksCount: number;
  activityLogsCount: number;
  lastActiveAt: string | null;
}

export interface AdminUserDetails {
  profile: {
    id: string;
    email: string;
    displayName: string;
    role: 'user' | 'admin';
    status: 'active' | 'inactive';
    isActive: boolean;
    createdAt: string;
    timezone: string;
    occupationType: string;
    workStart: string;
    workEnd: string;
  };
  devices: Array<{
    id: string;
    name: string;
    platform: string;
    lastSeenAt: string | null;
    revokedAt: string | null;
    createdAt: string;
    isSample: boolean;
    status: string;
  }>;
  productivitySummary: {
    totalFocusSessions: number;
    completedFocusSessions: number;
    totalScreenSec: number;
    totalScreenMinutes: number;
    focusedMinutes: number;
    distractedMinutes: number;
    focusScore: number;
    focusRating: string;
  };
  activitySummary: {
    lastActivityAt: string | null;
    totalSwitches: number;
    totalNotifications: number;
    recentActivity: Array<{
      name: string;
      category: string;
      durationSec: number;
      startedAt: string;
    }>;
  };
}

export interface AdminUsersResponse {
  users: AdminUserItem[];
  stats?: {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    totalAdmins: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DomainCategoryItem {
  id: string;
  kind: 'domain' | 'app';
  pattern: string;
  category: 'productive' | 'social' | 'communication' | 'entertainment' | 'other';
}

export interface AdminAuditLogsResponse {
  insights: Array<{
    id: string;
    userEmail: string;
    userName: string;
    type: string;
    title: string;
    content: string;
    metadata?: any;
    createdAt: string;
  }>;
  alerts: Array<{
    id: string;
    userEmail: string;
    title: string;
    message: string;
    type: string;
    severity: string;
    read: boolean;
    createdAt: string;
  }>;
  recommendations: Array<{
    id: string;
    userEmail: string;
    title: string;
    category: string;
    priority: string;
    status: string;
    createdAt: string;
  }>;
}

