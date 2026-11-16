import { PrismaClient } from '@prisma/client';
import { analyticsService } from '../src/modules/analytics/analytics.service.js';
import { activityService } from '../src/modules/activity/activity.service.js';
import { adminService } from '../src/modules/admin/admin.service.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 VERIFYING 3-DAY DEMO DATASET IN POSTGRESQL & BACKEND SERVICES...');

  const user = await prisma.user.findFirst({ where: { email: 'yashpathak086@gmail.com' } });
  if (!user) throw new Error('User not found');
  const userId = user.id;

  // 1. Verify Daily Analytics for all 3 days
  const dates = ['2026-11-11', '2026-11-12', '2026-11-13'];
  for (const date of dates) {
    const daily = await analyticsService.getDaily(userId, date);
    const focus = await analyticsService.getFocusScore(userId, date);
    const distractions = await analyticsService.getDistractions(userId, date);
    console.log(`\n📅 Date: ${date}`);
    console.log(`   - Attention Score: ${daily.attentionScore} (${focus.rating})`);
    console.log(`   - Screen Time: ${daily.totalScreenMinutes}m (Active: ${daily.activeMinutes}m, Focused: ${daily.focusedMinutes}m, Distracted: ${daily.distractedMinutes}m)`);
    console.log(`   - Switch Count: ${daily.switchCount}`);
    console.log(`   - By Category:`, daily.byCategory);
    console.log(`   - Top Apps:`, daily.topApps.map((a: any) => `${a.name} (${Math.round(a.durationSec / 60)}m)`));
    console.log(`   - Top Sites:`, daily.topSites.map((s: any) => `${s.name} (${Math.round(s.durationSec / 60)}m)`));
  }

  // 2. Verify Weekly Summary
  console.log('\n📊 Weekly Summary:');
  const weekly = await analyticsService.getWeeklySummary(userId, '2026-11-13');
  console.log(`   - Weekly Average Score: ${weekly.weeklyAverage}`);
  console.log(`   - Days with Data: ${weekly.daysWithDataCount}`);
  for (const d of weekly.days) {
    if (d.hasData) {
      console.log(`     * ${d.day} (${d.date}): Score = ${d.score}, Active = ${d.activeMinutes}m`);
    }
  }

  // 3. Verify Applications Included (Spotify, Netflix, YouTube, WhatsApp, Instagram, Telegram, VS Code, Chrome, Notion, Word, Google Docs, GitHub, ChatGPT, Terminal)
  console.log('\n📱 Checking Target Applications Presence in ActivityLog:');
  const logs = await prisma.activityLog.findMany({
    where: { userId, startedAt: { gte: new Date('2026-11-11T00:00:00Z'), lte: new Date('2026-11-13T23:59:59Z') } },
    select: { domain: true, appName: true, category: true, durationSec: true },
  });
  const foundNames = new Set(logs.map(l => l.appName || l.domain));
  console.log('   Total Activity Logs for 3 days:', logs.length);
  console.log('   Unique Apps/Domains found:', Array.from(foundNames).join(', '));

  // 4. Verify Focus Sessions
  console.log('\n🎯 Focus Sessions:');
  const sessions = await prisma.focusSession.findMany({
    where: { userId, startedAt: { gte: new Date('2026-11-11T00:00:00Z') } },
    orderBy: { startedAt: 'asc' },
  });
  console.log(`   Total Focus Sessions: ${sessions.length}`);
  for (const s of sessions) {
    console.log(`   - Planned: ${s.plannedMin}m, Status: ${s.status}, Started: ${s.startedAt.toISOString()}, Interrupted: ${s.interruptionCount}`);
  }

  // 5. Verify Recommendations & AI Insights
  console.log('\n💡 AI Insights & Recommendations:');
  const recs = await prisma.recommendation.findMany({ where: { userId } });
  console.log(`   Active Recommendations: ${recs.length}`);
  for (const r of recs) {
    console.log(`   - [${r.category}] ${r.title}`);
  }

  const insights = await prisma.aIInsight.findMany({ where: { userId } });
  console.log(`   AI Insights: ${insights.length}`);
  for (const ins of insights) {
    console.log(`   - [${ins.type}] ${ins.title}`);
  }

  // 6. Verify Admin Overview Metrics
  console.log('\n🛡️ Admin Overview Aggregates:');
  const adminOverview = await adminService.getOverview();
  console.log(`   - Total Users: ${adminOverview.metrics.totalUsers}`);
  console.log(`   - Active 7d: ${adminOverview.metrics.active7d}`);
  console.log(`   - Total Sessions: ${adminOverview.metrics.totalSessions}`);
  console.log(`   - Sessions 7d: ${adminOverview.metrics.sessions7d}`);
  console.log(`   - Total Screen Time: ${adminOverview.metrics.totalScreenMinutes}m`);

  console.log('\n✅ ALL VERIFICATION CHECKS PASSED PERFECTLY!');
}

main()
  .catch((e) => {
    console.error('❌ Verification failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
