-- =========================================================================
-- AI-Powered Digital Attention Management System
-- PostgreSQL Database Schema Copy (Source of Truth matching Prisma)
-- =========================================================================

-- ENUM DEFINITIONS
CREATE TYPE "OccupationType" AS ENUM ('student', 'professional');
CREATE TYPE "GoalType" AS ENUM ('focus_minutes', 'max_screen_minutes', 'max_context_switches', 'custom');
CREATE TYPE "GoalPeriod" AS ENUM ('daily', 'weekly');
CREATE TYPE "DevicePlatform" AS ENUM ('chrome', 'windows');
CREATE TYPE "ActivitySource" AS ENUM ('browser', 'desktop');
CREATE TYPE "CategoryKind" AS ENUM ('domain', 'app');
CREATE TYPE "Category" AS ENUM ('productive', 'social', 'communication', 'entertainment', 'other');
CREATE TYPE "FocusSessionStatus" AS ENUM ('active', 'completed', 'abandoned');

-- 1. USERS TABLE
CREATE TABLE "User" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL UNIQUE,
    "passwordHash" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. USER PROFILE
CREATE TABLE "Profile" (
    "userId" UUID PRIMARY KEY REFERENCES "User"("id") ON DELETE CASCADE,
    "displayName" VARCHAR(100) NOT NULL,
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'UTC',
    "occupationType" "OccupationType" NOT NULL DEFAULT 'student',
    "workStart" VARCHAR(5) NOT NULL DEFAULT '09:00',
    "workEnd" VARCHAR(5) NOT NULL DEFAULT '17:00'
);

-- 3. DEVICES TABLE (Chrome Extension & Windows Desktop App)
CREATE TABLE "Device" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "name" VARCHAR(100) NOT NULL,
    "platform" "DevicePlatform" NOT NULL DEFAULT 'chrome',
    "tokenHash" VARCHAR(255) NOT NULL UNIQUE,
    "lastSeenAt" TIMESTAMP WITH TIME ZONE,
    "revokedAt" TIMESTAMP WITH TIME ZONE,
    "isSample" BOOLEAN NOT NULL DEFAULT FALSE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "Device_userId_idx" ON "Device"("userId");

-- 4. DOMAIN & APP CATEGORIES MAPPING
CREATE TABLE "DomainCategory" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "kind" "CategoryKind" NOT NULL DEFAULT 'domain',
    "pattern" VARCHAR(255) NOT NULL,
    "category" "Category" NOT NULL,
    CONSTRAINT "DomainCategory_kind_pattern_unique" UNIQUE ("kind", "pattern")
);

-- 5. ACTIVITY LOGS TABLE (Heart of feature extraction)
CREATE TABLE "ActivityLog" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "deviceId" UUID NOT NULL REFERENCES "Device"("id") ON DELETE CASCADE,
    "clientEventId" VARCHAR(128) NOT NULL,
    "source" "ActivitySource" NOT NULL DEFAULT 'browser',
    "domain" VARCHAR(255),
    "appName" VARCHAR(255),
    "category" "Category" NOT NULL,
    "startedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "endedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "durationSec" INTEGER NOT NULL,
    "idle" BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT "ActivityLog_deviceId_clientEventId_unique" UNIQUE ("deviceId", "clientEventId")
);
CREATE INDEX "ActivityLog_userId_startedAt_idx" ON "ActivityLog"("userId", "startedAt" DESC);

-- 6. CONTEXT SWITCHES TABLE (Task switching frequency)
CREATE TABLE "ContextSwitch" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "deviceId" UUID NOT NULL REFERENCES "Device"("id") ON DELETE CASCADE,
    "clientEventId" VARCHAR(128) NOT NULL,
    "fromApp" VARCHAR(255) NOT NULL,
    "toApp" VARCHAR(255) NOT NULL,
    "switchedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT "ContextSwitch_deviceId_clientEventId_unique" UNIQUE ("deviceId", "clientEventId")
);
CREATE INDEX "ContextSwitch_userId_switchedAt_idx" ON "ContextSwitch"("userId", "switchedAt" DESC);

-- 7. NOTIFICATION EVENTS TABLE (Interruptive stimuli)
CREATE TABLE "NotificationEvent" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "deviceId" UUID NOT NULL REFERENCES "Device"("id") ON DELETE CASCADE,
    "clientEventId" VARCHAR(128) NOT NULL,
    "sourceApp" VARCHAR(255) NOT NULL,
    "receivedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT "NotificationEvent_deviceId_clientEventId_unique" UNIQUE ("deviceId", "clientEventId")
);
CREATE INDEX "NotificationEvent_userId_receivedAt_idx" ON "NotificationEvent"("userId", "receivedAt" DESC);

-- 8. FOCUS SESSIONS TABLE (Target reference for training)
CREATE TABLE "FocusSession" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "plannedMin" INTEGER NOT NULL,
    "startedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "endedAt" TIMESTAMP WITH TIME ZONE,
    "status" "FocusSessionStatus" NOT NULL,
    "interruptionCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "FocusSession_userId_startedAt_idx" ON "FocusSession"("userId", "startedAt" DESC);

-- 9. DAILY USAGE STATS TABLE
CREATE TABLE "DailyUsageStat" (
    "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "date" VARCHAR(10) NOT NULL,
    "totalScreenSec" INTEGER NOT NULL,
    "activeSec" INTEGER NOT NULL,
    "idleSec" INTEGER NOT NULL,
    "switchCount" INTEGER NOT NULL,
    "notificationCount" INTEGER NOT NULL,
    "topSites" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "topApps" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "byCategory" JSONB NOT NULL DEFAULT '{}'::jsonb,
    PRIMARY KEY ("userId", "date")
);

-- 10. HOURLY USAGE PATTERNS TABLE
CREATE TABLE "HourlyUsagePattern" (
    "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "date" VARCHAR(10) NOT NULL,
    "hour" INTEGER NOT NULL,
    "activeSec" INTEGER NOT NULL,
    "idleSec" INTEGER NOT NULL,
    "switchCount" INTEGER NOT NULL,
    "notificationCount" INTEGER NOT NULL,
    PRIMARY KEY ("userId", "date", "hour")
);
