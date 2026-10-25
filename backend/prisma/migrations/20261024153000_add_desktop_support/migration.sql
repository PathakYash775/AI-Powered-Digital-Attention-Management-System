-- AlterEnum
ALTER TYPE "DevicePlatform" ADD VALUE 'windows';

-- CreateEnum
CREATE TYPE "ActivitySource" AS ENUM ('browser', 'desktop');

-- CreateEnum
CREATE TYPE "CategoryKind" AS ENUM ('domain', 'app');

-- AlterTable DomainCategory
ALTER TABLE "DomainCategory" ADD COLUMN "kind" "CategoryKind" NOT NULL DEFAULT 'domain';

-- DropIndex
DROP INDEX IF EXISTS "DomainCategory_pattern_key";

-- CreateIndex
CREATE UNIQUE INDEX "DomainCategory_kind_pattern_key" ON "DomainCategory"("kind", "pattern");

-- AlterTable ActivityLog
ALTER TABLE "ActivityLog" ADD COLUMN "source" "ActivitySource" NOT NULL DEFAULT 'browser',
ADD COLUMN "appName" TEXT,
ALTER COLUMN "domain" DROP NOT NULL;

-- AddCheckConstraint
ALTER TABLE "ActivityLog" ADD CONSTRAINT "activity_log_source_check"
CHECK (("source" = 'browser' AND "domain" IS NOT NULL AND "appName" IS NULL) OR ("source" = 'desktop' AND "appName" IS NOT NULL AND "domain" IS NULL));

-- AlterTable DailyUsageStat
ALTER TABLE "DailyUsageStat" ADD COLUMN "topApps" JSONB NOT NULL DEFAULT '[]';
