import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useActivityReport } from './hooks';
import { analyticsApi } from '../../api/analytics';
import { useAuth } from '../auth/AuthContext';
import {
  formatTime,
  formatDuration,
  formatNumber,
  getTodayDateString,
  formatAppName,
} from '../../lib/format';
import { CategoryDonutChart } from '../../components/charts/CategoryDonutChart';
import {
  WeeklyFocusBarChart,
  type WeeklyDayScore,
} from '../../components/charts/WeeklyFocusBarChart';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { FocusSummaryWidget } from './FocusSummaryWidget';
import { TodayTasksWidget } from './TodayTasksWidget';
import { AIAssistantWidget } from '../ai/AIAssistantWidget';
import { AppTypeIcon } from '../../components/ui/AppTypeIcon';
import styles from './DashboardPage.module.css';

function normalizeCategoryBreakdown(raw: unknown): Record<string, number> {
  const result: Record<string, number> = {
    productive: 0,
    communication: 0,
    entertainment: 0,
    social: 0,
    other: 0,
  };

  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (item && typeof item === 'object' && 'category' in item) {
        const cat = String(item.category).toLowerCase();
        result[cat] = (result[cat] || 0) + (Number(item.durationSec) || 0);
      }
    }
    return result;
  }

  if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      const cat = k.toLowerCase();
      result[cat] = (result[cat] || 0) + (Number(v) || 0);
    }
    return result;
  }

  return result;
}

export function DashboardPage() {
  const { user } = useAuth();
  const userName = (user as any)?.name || user?.email?.split('@')[0] || 'Yash';
  const today = getTodayDateString();
  const [selectedDate, setSelectedDate] = useState(today);

  const { data: report, isLoading, isError } = useActivityReport(selectedDate);

  // Synchronize 100% with AI Models & Analytics (/analytics) endpoints
  const { data: weeklyData } = useQuery({
    queryKey: ['analytics', 'weekly-summary', selectedDate],
    queryFn: () => analyticsApi.getWeeklySummary(selectedDate),
    staleTime: 10_000,
  });

  const { data: focusScoreData } = useQuery({
    queryKey: ['analytics', 'focus-score', selectedDate],
    queryFn: () => analyticsApi.getFocusScore(selectedDate),
    staleTime: 10_000,
  });

  const { data: distractionsData } = useQuery({
    queryKey: ['analytics', 'distractions', selectedDate],
    queryFn: () => analyticsApi.getDistractions(selectedDate),
    staleTime: 10_000,
  });

  const { data: dailyData } = useQuery({
    queryKey: ['analytics', 'daily', selectedDate],
    queryFn: () => analyticsApi.getDaily(selectedDate),
    staleTime: 10_000,
  });

  const { data: summaryData } = useQuery({
    queryKey: ['analytics', 'summary', selectedDate],
    queryFn: () => analyticsApi.getSummary(selectedDate),
    staleTime: 10_000,
  });

  const { data: insightsData } = useQuery({
    queryKey: ['analytics', 'insights', selectedDate],
    queryFn: () => analyticsApi.getInsights(selectedDate),
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className={styles.container}>
        <Spinner label="Loading dashboard report..." />
        <FocusSummaryWidget selectedDate={selectedDate} />
      </div>
    );
  }

  if (isError || !report) {
    return (
      <div className={styles.container}>
        <div role="alert" className={styles.errorAlert}>
          Failed to load activity summary report.
        </div>
        <FocusSummaryWidget selectedDate={selectedDate} />
      </div>
    );
  }

  const {
    summary,
    categoryBreakdown,
    focusSessions = [],
    goals = [],
  } = report;

  const safeSummary = {
    totalScreenSec: Number(summary?.totalScreenSec) || 0,
    activeSec: Number(summary?.activeSec) || 0,
    idleSec: Number(summary?.idleSec) || 0,
    switchCount: Number(summary?.switchCount) || 0,
    notificationCount: Number(summary?.notificationCount) || 0,
    topSites: Array.isArray(summary?.topSites) ? summary.topSites : [],
    topApps: Array.isArray(summary?.topApps) ? summary.topApps : [],
  };

  const topApps = safeSummary.topApps;
  const topSites = safeSummary.topSites;

  // Determine if the user has any recorded activity (identical to AnalyticsPage)
  const todayWeekly = weeklyData?.today;
  const hasRecordedActivity = Boolean(
    (todayWeekly && todayWeekly.hasData) ||
      (dailyData && dailyData.activeMinutes > 0) ||
      (summaryData && summaryData.totalScreenMinutes > 0) ||
      (safeSummary.totalScreenSec > 0) ||
      (safeSummary.activeSec > 0) ||
      (focusScoreData?.focusScore !== undefined && focusScoreData?.focusScore !== null)
  );

  const hasActivity =
    hasRecordedActivity ||
    safeSummary.switchCount > 0 ||
    safeSummary.notificationCount > 0 ||
    topSites.length > 0 ||
    topApps.length > 0;

  // 1. Focus Score (0-100) — identical logic to AnalyticsPage
  const focusScore =
    hasRecordedActivity && todayWeekly?.focusScore !== null && todayWeekly?.focusScore !== undefined
      ? todayWeekly.focusScore
      : hasRecordedActivity && focusScoreData?.focusScore !== undefined && focusScoreData?.focusScore !== null
      ? focusScoreData.focusScore
      : hasRecordedActivity && safeSummary.totalScreenSec > 0
      ? Math.round((safeSummary.activeSec / safeSummary.totalScreenSec) * 100)
      : null;

  // 2. Weekly Average (calculated from available days with data)
  const weeklyAverage = weeklyData?.weeklyAverage ?? (hasRecordedActivity ? focusScore : null);

  // 3. Screen Time
  const totalScreenMinutes =
    todayWeekly?.totalScreenMinutes ??
    summaryData?.totalScreenMinutes ??
    (dailyData ? Math.round(dailyData.totalScreenMinutes) : 0) ??
    (safeSummary.totalScreenSec > 0 ? Math.round(safeSummary.totalScreenSec / 60) : 0);

  const activeMinutes =
    todayWeekly?.activeMinutes ??
    summaryData?.activeMinutes ??
    (dailyData ? Math.round(dailyData.activeMinutes) : 0) ??
    (safeSummary.activeSec > 0 ? Math.round(safeSummary.activeSec / 60) : 0);

  // 4. Distractions
  const distractionCount = distractionsData?.distractionCount ?? 0;
  const switchCount =
    todayWeekly?.switchCount ??
    distractionsData?.switchCount ??
    summaryData?.switchCount ??
    safeSummary.switchCount;
  const distractedMinutes =
    todayWeekly?.distractedMinutes ?? distractionsData?.distractedMinutes ?? 0;

  // 5. Completed Focus Sessions
  const completedFocusSessions = todayWeekly?.completedFocusSessions ?? focusSessions.length;

  // Weekly Days Grid for Bar Chart (identical to AnalyticsPage)
  const weeklyDays: WeeklyDayScore[] = (weeklyData?.days && weeklyData.days.length > 0)
    ? weeklyData.days.map((d) => ({
        day: d.day,
        score: d.hasData ? d.score : null,
        hasData: Boolean(d.hasData && d.score !== null),
        isToday: d.isToday,
      }))
    : [
        { day: 'Mon', score: null, hasData: false },
        { day: 'Tue', score: null, hasData: false },
        { day: 'Wed', score: null, hasData: false },
        { day: 'Thu', score: null, hasData: false },
        { day: 'Fri', score: hasRecordedActivity ? focusScore : null, hasData: hasRecordedActivity, isToday: true },
        { day: 'Sat', score: null, hasData: false },
        { day: 'Sun', score: null, hasData: false },
      ];

  const maxSiteDuration =
    topSites.length > 0
      ? Math.max(...topSites.map((s) => Number(s?.durationSec) || 0), 1)
      : 1;

  const maxAppDuration =
    topApps.length > 0
      ? Math.max(...topApps.map((a) => Number(a?.durationSec) || 0), 1)
      : 1;

  // Use category breakdown or fallback to summary.byCategory
  const activeBreakdown = normalizeCategoryBreakdown(
    categoryBreakdown && Object.values(categoryBreakdown).some((v) => Number(v) > 0)
      ? categoryBreakdown
      : (summary as any)?.byCategory,
  );

  const getDomainCategory = (domain?: string | null): string => {
    if (!domain || typeof domain !== 'string') return 'other';
    const d = domain.toLowerCase();
    if (
      d.includes('github') ||
      d.includes('chatgpt') ||
      d.includes('claude') ||
      d.includes('notion') ||
      d.includes('linear') ||
      d.includes('localhost') ||
      d.includes('127.0.0.1')
    ) {
      return 'productive';
    }
    if (
      d.includes('slack') ||
      d.includes('mail') ||
      d.includes('teams') ||
      d.includes('discord')
    ) {
      return 'communication';
    }
    if (d.includes('youtube') || d.includes('netflix') || d.includes('spotify')) {
      return 'entertainment';
    }
    if (
      d.includes('reddit') ||
      d.includes('twitter') ||
      d.includes('instagram') ||
      d.includes('linkedin') ||
      d.includes('x.com')
    ) {
      return 'social';
    }
    return 'other';
  };

  const getAppCategory = (appName?: string | null): string => {
    if (!appName || typeof appName !== 'string') return 'other';
    const lower = appName.toLowerCase();
    if (
      lower.includes('code') ||
      lower.includes('cursor') ||
      lower.includes('terminal') ||
      lower.includes('notepad') ||
      lower.includes('word') ||
      lower.includes('excel') ||
      lower.includes('powerpnt') ||
      lower.includes('figma') ||
      lower.includes('antigravity')
    ) {
      return 'productive';
    }
    if (
      lower.includes('slack') ||
      lower.includes('teams') ||
      lower.includes('discord') ||
      lower.includes('outlook') ||
      lower.includes('whatsapp')
    ) {
      return 'communication';
    }
    if (lower.includes('spotify') || lower.includes('vlc') || lower.includes('steam')) {
      return 'entertainment';
    }
    return 'other';
  };

  // Top 5 Combined Applications for mobile view
  const combinedApps = [
    ...topApps.map((a) => ({
      name: a?.name || 'Unknown App',
      durationSec: Number(a?.durationSec) || 0,
      category: a?.category || getAppCategory(a?.name),
      isDomain: false,
    })),
    ...topSites.map((s) => ({
      name: s?.name || (s as any)?.domain || 'Unknown Website',
      durationSec: Number(s?.durationSec) || 0,
      category: s?.category || getDomainCategory(s?.name || (s as any)?.domain),
      isDomain: true,
    })),
  ].sort((a, b) => b.durationSec - a.durationSec);

  const topFiveApps = combinedApps.slice(0, 5);
  const maxCombinedDuration = topFiveApps.length > 0 ? Math.max(topFiveApps[0].durationSec, 1) : 1;

  const currentHour = new Date().getHours();
  const timeGreeting =
    currentHour < 12 ? 'Good Morning' : currentHour < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <ErrorBoundary fallbackTitle="Dashboard Encountered an Error">
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerWelcome}>
            <h1 className={styles.greetingTitle}>
              {timeGreeting}, {userName} <span className={styles.greetingWave}>👋</span>
            </h1>
            <p className={styles.greetingSubtitle}>
              Here is your digital attention telemetry, focus scores, and activity patterns.
            </p>
          </div>

          <div className={styles.headerActions}>
            <div className={styles.trackingActiveBadge}>
              <span className={styles.activeDot} />
              <span>Tracking Active</span>
            </div>

            <div className={styles.datePicker}>
              <label htmlFor="dashboard-date" className={styles.dateLabel}>
                Date:
              </label>
              <input
                id="dashboard-date"
                type="date"
                max={today}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          </div>
        </header>

        {!hasActivity ? (
          <EmptyState
            message="No activity recorded for this date."
            description="Keep your paired Chrome extension or Windows desktop app active to record real activity directly into PostgreSQL."
          />
        ) : (
          <>
            {/* Mobile Prominent Daily Focus Score Hero Card */}
            <section className={styles.mobileHeroCard} aria-label="Daily Focus Score Overview">
              <div className={styles.heroScoreRow}>
                <div className={styles.circularScoreWrap}>
                  <svg className={styles.circularSvg} viewBox="0 0 100 100">
                    <circle className={styles.circularTrack} cx="50" cy="50" r="42" />
                    <circle
                      className={styles.circularProgress}
                      cx="50"
                      cy="50"
                      r="42"
                      strokeDasharray={264}
                      strokeDashoffset={264 - (264 * Math.min(100, focusScore ?? 0)) / 100}
                      stroke={
                        focusScore !== null && focusScore >= 70
                          ? '#13B981'
                          : focusScore !== null && focusScore >= 50
                          ? '#348BFF'
                          : '#F59E0B'
                      }
                    />
                  </svg>
                  <div className={styles.circularInner}>
                    <span className={styles.circularValue}>{focusScore !== null ? focusScore : '—'}</span>
                    <span className={styles.circularTotal}>/100</span>
                  </div>
                </div>

                <div className={styles.heroScoreInfo}>
                  <div className={styles.heroLabelRow}>
                    <span className={styles.heroScoreTitle}>Daily Focus Score</span>
                    <span
                      className={`${styles.trendBadge} ${
                        focusScore !== null && focusScore >= 70
                          ? styles.trendPositive
                          : styles.trendNeutral
                      }`}
                    >
                      {focusScore !== null && focusScore >= 70
                        ? 'Optimal'
                        : focusScore !== null && focusScore >= 50
                        ? 'Moderate'
                        : focusScore !== null
                        ? 'Needs Focus'
                        : 'No Data'}
                    </span>
                  </div>
                  <p className={styles.heroTrendText}>
                    {weeklyAverage && focusScore !== null
                      ? `${focusScore >= weeklyAverage ? '▲ +' : '▼ '}${focusScore - weeklyAverage}% vs 7d average (${weeklyAverage})`
                      : 'Calibrated from active telemetry'}
                  </p>
                  <div className={styles.heroStatusBar}>
                    <div
                      className={styles.heroStatusBarFill}
                      style={{
                        width: `${Math.min(100, focusScore ?? 0)}%`,
                        backgroundColor:
                          focusScore !== null && focusScore >= 70
                            ? '#13B981'
                            : focusScore !== null && focusScore >= 50
                            ? '#348BFF'
                            : '#F59E0B',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Quick Action Chips Bar */}
              <div className={styles.quickActionsBar}>
                <Link to="/focus" className={`${styles.quickActionBtn} ${styles.quickActionPrimary}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  <span>Start Focus Block</span>
                </Link>
                <Link to="/tasks" className={styles.quickActionBtn}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                  <span>Tasks</span>
                </Link>
                <Link to="/goals" className={styles.quickActionBtn}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
                  <span>Goals</span>
                </Link>
                <Link to="/recommendations" className={styles.quickActionBtn}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07l14.14-14.14"/></svg>
                  <span>AI Tips</span>
                </Link>
              </div>
            </section>

            <section className={styles.cardsGrid} aria-label="Key activity statistics">
              {/* Card 1: Focus Score */}
              <div className={styles.card}>
                <div className={styles.cardTopRow}>
                  <h2 className={styles.cardLabel}>Focus Score</h2>
                  <span
                    className={`${styles.trendBadge} ${
                      focusScore !== null && focusScore >= 70
                        ? styles.trendPositive
                        : styles.trendNeutral
                    }`}
                  >
                    {focusScore !== null && focusScore >= 70
                      ? 'Good'
                      : focusScore !== null && focusScore >= 50
                      ? 'Moderate'
                      : focusScore !== null
                      ? 'Needs Focus'
                      : 'No Data'}
                  </span>
                </div>
                <div className={styles.cardMainRow}>
                  <p className={styles.cardValue}>
                    {focusScore !== null ? `${focusScore}/100` : '—'}
                  </p>
                  <div className={styles.sparklineWrap}>
                    <svg width="52" height="20" viewBox="0 0 52 20" fill="none">
                      <path
                        d="M2 17L12 14L22 16L32 9L42 11L50 3"
                        stroke="var(--color-primary)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
                <span className={styles.cardSub}>
                  {focusScoreData?.rating
                    ? `${focusScoreData.rating} rating`
                    : 'Steady cognitive telemetry'}
                </span>
              </div>

              {/* Card 2: Screen Time */}
              <div className={styles.card}>
                <div className={styles.cardTopRow}>
                  <h2 className={styles.cardLabel}>Screen Time</h2>
                  <span className={`${styles.trendBadge} ${styles.trendPositive}`}>
                    {totalScreenMinutes > 0
                      ? `${Math.round((activeMinutes / totalScreenMinutes) * 100)}%`
                      : '0%'}
                  </span>
                </div>
                <p className={styles.cardValue}>{formatDuration(totalScreenMinutes * 60)}</p>
                <span className={styles.cardSub}>
                  {formatDuration(activeMinutes * 60)} focused engagement
                </span>
              </div>

              {/* Card 3: Distractions */}
              <div className={styles.card}>
                <div className={styles.cardTopRow}>
                  <h2 className={styles.cardLabel}>Distractions</h2>
                  <span className={`${styles.trendBadge} ${styles.trendNeutral}`}>
                    {distractionCount === 0 ? 'Optimal' : `${distractionCount} events`}
                  </span>
                </div>
                <p className={styles.cardValue}>{formatNumber(distractionCount)}</p>
                <span className={styles.cardSub}>
                  {switchCount} switches • {distractedMinutes}m distracted
                </span>
              </div>

              {/* Card 4: Focus Sessions */}
              <div className={styles.card}>
                <div className={styles.cardTopRow}>
                  <h2 className={styles.cardLabel}>Focus Sessions</h2>
                  <span
                    className={`${styles.trendBadge} ${
                      completedFocusSessions > 0 ? styles.trendPositive : styles.trendNeutral
                    }`}
                  >
                    {completedFocusSessions > 0 ? 'Active' : '0 Today'}
                  </span>
                </div>
                <p className={styles.cardValue}>{completedFocusSessions} sessions</p>
                <span className={styles.cardSub}>
                  {focusSessions.length > 0
                    ? `${focusSessions.reduce((acc, s) => acc + (s.plannedMin || 0), 0)} min total focus`
                    : 'Completed sessions today'}
                </span>
              </div>

              {/* Card 5: Task Switches */}
              <div className={styles.card}>
                <div className={styles.cardTopRow}>
                  <h2 className={styles.cardLabel}>Task Switches</h2>
                  <span className={styles.cardSub}>Context budget</span>
                </div>
                <p className={styles.cardValue}>{formatNumber(switchCount)}</p>
                <span className={styles.cardSub}>
                  ~{Math.round(
                    switchCount /
                      (totalScreenMinutes > 0 ? Math.max(1, totalScreenMinutes / 60) : 8),
                  )}{' '}
                  switches / hour
                </span>
              </div>
            </section>

            {/* 3 Analytics Panels: Weekly Focus Score, Category Distribution, Focus Insights */}
            <section className={styles.analyticsTriGrid} aria-label="Visual analytics">
              {/* Panel A: Weekly Focus Score */}
              <div className={styles.analyticsCard}>
                <div className={styles.panelHeader}>
                  <h2 className={styles.panelTitle}>Weekly Focus Score</h2>
                  <span className={styles.panelSubtitle}>Mon – Sun performance</span>
                </div>
                <WeeklyFocusBarChart days={weeklyDays} averageScore={weeklyAverage} />
              </div>

              {/* Panel B: Category Distribution */}
              <div className={styles.analyticsCard}>
                <div className={styles.panelHeader}>
                  <h2 className={styles.panelTitle}>Category Distribution</h2>
                  <span className={styles.panelSubtitle}>Time share</span>
                </div>
                <CategoryDonutChart
                  categories={activeBreakdown as any}
                  totalSec={activeMinutes * 60 || safeSummary.activeSec}
                />
              </div>

              {/* Panel C: Focus Insights */}
              <div className={styles.analyticsCard}>
                <div className={styles.panelHeader}>
                  <h2 className={styles.panelTitle}>Focus Insights</h2>
                  <span className={styles.panelSubtitle}>AI cognitive analysis</span>
                </div>
                <div className={styles.insightsList}>
                  {insightsData?.insights && insightsData.insights.length > 0 ? (
                    insightsData.insights.slice(0, 3).map((insight, i) => {
                      const iconStyles = [
                        { box: styles.insightIconMint, icon: 'lightning' },
                        { box: styles.insightIconBlue, icon: 'clock' },
                        { box: styles.insightIconPurple, icon: 'target' },
                      ][i % 3];
                      return (
                        <div key={i} className={styles.insightItem}>
                          <div className={`${styles.insightIconBox} ${iconStyles.box}`}>
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                            >
                              {i % 3 === 0 ? (
                                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                              ) : i % 3 === 1 ? (
                                <>
                                  <circle cx="12" cy="12" r="10" />
                                  <path d="M12 6v6l4 2" />
                                </>
                              ) : (
                                <>
                                  <circle cx="12" cy="12" r="10" />
                                  <circle cx="12" cy="12" r="6" />
                                  <circle cx="12" cy="12" r="2" />
                                </>
                              )}
                            </svg>
                          </div>
                          <div className={styles.insightContent}>
                            <span className={styles.insightTitle}>
                              {insight.title ||
                                (i === 0
                                  ? 'Cognitive Stamina'
                                  : i === 1
                                  ? 'Context Switching'
                                  : 'AI Recommendation')}
                            </span>
                            <p className={styles.insightText}>
                              {insight.message || String(insight)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <>
                      <div className={styles.insightItem}>
                        <div className={`${styles.insightIconBox} ${styles.insightIconMint}`}>
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                          </svg>
                        </div>
                        <div className={styles.insightContent}>
                          <span className={styles.insightTitle}>Optimal Focus Window</span>
                          <p className={styles.insightText}>
                            Morning hours show highest cognitive stamina with lowest switch penalties.
                          </p>
                        </div>
                      </div>

                      <div className={styles.insightItem}>
                        <div className={`${styles.insightIconBox} ${styles.insightIconBlue}`}>
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 6v6l4 2" />
                          </svg>
                        </div>
                        <div className={styles.insightContent}>
                          <span className={styles.insightTitle}>Context Switch Control</span>
                          <p className={styles.insightText}>
                            {switchCount > 0
                              ? `${switchCount} total app switches recorded. Batch similar tasks to maintain flow state.`
                              : 'Keep app switches minimal to maintain a steady deep work streak.'}
                          </p>
                        </div>
                      </div>

                      <div className={styles.insightItem}>
                        <div className={`${styles.insightIconBox} ${styles.insightIconPurple}`}>
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <circle cx="12" cy="12" r="6" />
                            <circle cx="12" cy="12" r="2" />
                          </svg>
                        </div>
                        <div className={styles.insightContent}>
                          <span className={styles.insightTitle}>Personalized Recommendation</span>
                          <p className={styles.insightText}>
                            {focusScoreData?.recommendation ||
                              'Schedule complex analytical work before 1:00 PM to maximize output and mitigate fatigue.'}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </section>

            {/* Step 4: Today Tasks & AI Attention Assistant */}
            <section className={styles.twoColGrid} style={{ marginTop: 24 }}>
              <TodayTasksWidget />
              <AIAssistantWidget />
            </section>

            <section className={styles.twoColGrid}>
              <div className={styles.sectionCard}>
                <h2 className={styles.sectionTitle}>🎯 Daily Goal Targets</h2>
                {goals.length === 0 ? (
                  <p className={styles.emptySitesText}>
                    No active goals set yet. Go to Goals tab to configure.
                  </p>
                ) : (
                  <div className={styles.goalsList}>
                    {goals.map((g, idx) => {
                      if (!g) return null;
                      let current = 0;
                      let targetLabel = '';
                      let percent = 0;
                      let isReversed = false;
                      const targetVal = Number(g.targetValue) || 1;

                      if (g.type === 'focus_minutes') {
                        current = Math.round(activeMinutes);
                        targetLabel = `${current}m / ${targetVal}m`;
                        percent = Math.min(100, Math.round((current / targetVal) * 100));
                      } else if (g.type === 'max_screen_minutes') {
                        current = Math.round(totalScreenMinutes);
                        targetLabel = `${current}m / ${targetVal}m cap`;
                        percent = Math.min(100, Math.round((current / targetVal) * 100));
                        isReversed = true;
                      } else if (g.type === 'max_context_switches') {
                        current = switchCount;
                        targetLabel = `${current} / ${targetVal} max`;
                        percent = Math.min(100, Math.round((current / targetVal) * 100));
                        isReversed = true;
                      } else {
                        // Custom target (e.g. DSA, Reading)
                        current = Math.round(activeMinutes);
                        targetLabel = `${current}m / ${targetVal}m target`;
                        percent = Math.min(100, Math.round((current / targetVal) * 100));
                      }

                      const colorClass = isReversed
                        ? percent > 90
                          ? styles.goalRed
                          : percent > 70
                            ? styles.goalYellow
                            : styles.goalGreen
                        : percent >= 80
                          ? styles.goalGreen
                          : percent >= 50
                            ? styles.goalYellow
                            : styles.goalYellow;

                      const titleLabel =
                        g.type === 'focus_minutes'
                          ? 'Focus / Deep Work Minutes'
                          : g.type === 'max_screen_minutes'
                            ? 'Screen Time Limit'
                            : g.type === 'max_context_switches'
                              ? 'Context Switch Budget'
                              : g.customName || 'Custom Focus Target';

                      return (
                        <div key={g.id || idx} className={styles.goalItem}>
                          <div className={styles.goalHeader}>
                            <span className={styles.goalName}>{titleLabel}</span>
                            <span className={styles.goalNumbers}>
                              {targetLabel} ({percent}%)
                            </span>
                          </div>
                          <div className={styles.goalTrack}>
                            <div
                              className={`${styles.goalFill} ${colorClass}`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className={styles.sectionCard}>
                <h2 className={styles.sectionTitle}>⏱️ Focus &amp; Session Tracking</h2>
                {focusSessions.length === 0 ? (
                  <p className={styles.emptySitesText}>No focus sessions logged for this day.</p>
                ) : (
                  <div className={styles.sessionsList}>
                    {focusSessions.map((session, index) => {
                      if (!session) return null;
                      return (
                        <div key={session.id || index} className={styles.sessionItem}>
                          <div>
                            <div className={styles.sessionTime}>
                              {session.plannedMin}m Focus Block
                            </div>
                            <div className={styles.goalNumbers}>
                              Started at {formatTime(session.startedAt)}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span className={`${styles.sessionStatus} ${styles.completedStatus}`}>
                              ✓ {session.status}
                            </span>
                            <div
                              className={styles.goalNumbers}
                              style={{ fontSize: '0.6875rem', marginTop: 2 }}
                            >
                              {session.interruptionCount} interruptions
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* Mobile Top 5 Applications List (touch-friendly) */}
            <section className={styles.mobileTopAppsCard} aria-label="Top 5 Applications">
              <div className={styles.panelHeaderWithAction}>
                <div>
                  <h2 className={styles.panelTitle}>Top Applications</h2>
                  <span className={styles.panelSubtitle}>Today's usage breakdown</span>
                </div>
                <Link to="/activity" className={styles.viewAllBtn}>
                  <span>View All</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="9 18 15 12 9 6" /></svg>
                </Link>
              </div>

              {topFiveApps.length === 0 ? (
                <p className={styles.emptySitesText}>No application usage tracked yet for this date.</p>
              ) : (
                <div className={styles.mobileAppList}>
                  {topFiveApps.map((item, idx) => {
                    const formattedName = formatAppName(item.name);
                    const percentage = Math.min(100, Math.round((item.durationSec / maxCombinedDuration) * 100));
                    return (
                      <div key={idx} className={styles.mobileAppRow}>
                        <div className={styles.mobileAppIconBox}>
                          <AppTypeIcon name={formattedName} domain={item.isDomain ? item.name : undefined} category={item.category} size={18} />
                        </div>
                        <div className={styles.mobileAppDetails}>
                          <div className={styles.mobileAppHeaderRow}>
                            <span className={styles.mobileAppName}>{formattedName}</span>
                            <span className={styles.mobileAppDuration}>{formatDuration(item.durationSec)}</span>
                          </div>
                          <div className={styles.mobileAppSubRow}>
                            <span className={`${styles.catBadge} ${styles[item.category] || styles.other}`}>
                              {item.category}
                            </span>
                            <div className={styles.mobileProgressBarTrack}>
                              <div className={styles.mobileProgressBarFill} style={{ width: `${percentage}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* AI Daily Briefing Card */}
            <section className={styles.aiDailyBriefingCard} aria-label="AI Daily Briefing">
              <div className={styles.briefingHeader}>
                <div className={styles.briefingIconWrap}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M12 2a4 4 0 0 1 4 4c0 1.95-1.4 3.58-3.25 3.93L12 22" />
                    <path d="M12 2a4 4 0 0 0-4 4c0 1.95 1.4 3.58 3.25 3.93" />
                    <path d="M8 8a6 6 0 0 0-4 6c0 3 2 5.5 5 5.92" />
                    <path d="M16 8a6 6 0 0 1 4 6c0 3-2 5.5-5 5.92" />
                  </svg>
                </div>
                <div className={styles.briefingTitleGroup}>
                  <h3 className={styles.briefingTitle}>AI Daily Attention Briefing</h3>
                  <span className={styles.briefingMeta}>Calibrated from cognitive telemetry</span>
                </div>
              </div>
              <div className={styles.briefingBody}>
                <div className={styles.briefingItem}>
                  <span className={styles.briefingItemTag}>Observation</span>
                  <p className={styles.briefingItemText}>
                    {insightsData?.insights?.[0]?.message || 'Core focus blocks were protected from interruptions, preserving working memory.'}
                  </p>
                </div>
                <div className={styles.briefingItem}>
                  <span className={styles.briefingItemTag}>Recommendation</span>
                  <p className={styles.briefingItemText}>
                    {focusScoreData?.recommendation || 'Schedule complex analytical tasks during morning peak hours to minimize cognitive fatigue.'}
                  </p>
                </div>
              </div>
              <Link to="/analytics" className={styles.briefingActionBtn}>
                <span>View Complete AI Analytics &amp; Models</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
              </Link>
            </section>

            <section className={`${styles.twoColGrid} ${styles.desktopSitesAndAppsGrid}`} aria-label="Top applications and websites">
              <div className={styles.sectionCard}>
                <h2 className={styles.sectionTitle}>🌐 Top Websites &amp; Web Apps</h2>
                {topSites.length === 0 ? (
                  <p className={styles.emptySitesText}>No website usage tracked for this date.</p>
                ) : (
                  <ul className={styles.sitesList}>
                    {topSites.map((site, idx) => {
                      if (!site) return null;
                      const siteRawName =
                        site?.name || (site as any)?.domain || 'Unknown Website';
                      const duration = Number(site?.durationSec) || 0;
                      const percentage = Math.min(
                        100,
                        Math.round((duration / maxSiteDuration) * 100),
                      );
                      const category = site?.category || getDomainCategory(siteRawName);
                      const formattedName = formatAppName(siteRawName);

                      return (
                        <li key={site?.name || idx} className={styles.siteItem}>
                          <div className={styles.siteHeader}>
                            <div className={styles.siteTitleGroup}>
                              <AppTypeIcon name={formattedName} domain={siteRawName} category={category} size={15} />
                              <span className={styles.siteName}>{formattedName}</span>
                              {formattedName !== siteRawName && (
                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                  ({siteRawName})
                                </span>
                              )}
                              <span
                                className={`${styles.catBadge} ${
                                   styles[category] || styles.other
                                }`}
                              >
                                {category}
                              </span>
                            </div>
                            <span className={styles.siteDuration}>
                              {formatDuration(duration)}
                            </span>
                          </div>
                          <div
                            className={styles.barTrack}
                            role="progressbar"
                            aria-valuenow={percentage}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`Time spent on ${siteRawName}`}
                          >
                            <div className={styles.barFill} style={{ width: `${percentage}%` }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className={styles.sectionCard}>
                <h2 className={styles.sectionTitle}>💻 Top Desktop Applications</h2>
                {topApps.length === 0 ? (
                  <p className={styles.emptySitesText}>
                    No desktop application activity tracked for this date.
                  </p>
                ) : (
                  <ul className={styles.sitesList}>
                    {topApps.map((app, idx) => {
                      if (!app) return null;
                      const appRawName = app?.name || 'Unknown App';
                      const duration = Number(app?.durationSec) || 0;
                      const percentage = Math.min(
                        100,
                        Math.round((duration / maxAppDuration) * 100),
                      );
                      const category = app?.category || getAppCategory(appRawName);
                      const formattedName = formatAppName(appRawName);

                      return (
                        <li key={app?.name || idx} className={styles.siteItem}>
                          <div className={styles.siteHeader}>
                            <div className={styles.siteTitleGroup}>
                              <AppTypeIcon name={formattedName} category={category} size={15} />
                              <span className={styles.siteName}>{formattedName}</span>
                              {appRawName &&
                                formattedName.toLowerCase() !== appRawName.toLowerCase() && (
                                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                    ({appRawName})
                                  </span>
                                )}
                              <span
                                className={`${styles.catBadge} ${
                                  styles[category] || styles.other
                                }`}
                              >
                                {category}
                              </span>
                            </div>
                            <span className={styles.siteDuration}>
                              {formatDuration(duration)}
                            </span>
                          </div>
                          <div
                            className={styles.barTrack}
                            role="progressbar"
                            aria-valuenow={percentage}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`Time spent on ${appRawName}`}
                          >
                            <div className={styles.barFill} style={{ width: `${percentage}%` }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>
          </>
        )}

        {/* Small Focus Summary Box in the bottom-left corner */}
        <FocusSummaryWidget selectedDate={selectedDate} />
      </div>
    </ErrorBoundary>
  );
}
