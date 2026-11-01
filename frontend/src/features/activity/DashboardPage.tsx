import { useState } from 'react';
import { useActivityReport } from './hooks';
import {
  formatTime,
  formatDuration,
  formatNumber,
  getTodayDateString,
  formatAppName,
} from '../../lib/format';
import { CategoryDonutChart } from '../../components/charts/CategoryDonutChart';
import { HourlyTimelineChart } from '../../components/charts/HourlyTimelineChart';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { FocusSummaryWidget } from './FocusSummaryWidget';
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
  const today = getTodayDateString();
  const [selectedDate, setSelectedDate] = useState(today);

  const { data: report, isLoading, isError } = useActivityReport(selectedDate);

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
    hourlyPatterns = [],
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

  const hasActivity =
    safeSummary.totalScreenSec > 0 ||
    safeSummary.switchCount > 0 ||
    safeSummary.notificationCount > 0 ||
    topSites.length > 0 ||
    topApps.length > 0;

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

  return (
    <ErrorBoundary fallbackTitle="Dashboard Encountered an Error">
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.titleArea}>
            <h1 className={styles.title}>Activity Dashboard</h1>
            {hasActivity && (
              <span className={styles.demoBadge}>
                <span>⚡</span> Live PostgreSQL Telemetry
              </span>
            )}
          </div>

          <div className={styles.headerActions}>
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
            <section className={styles.cardsGrid} aria-label="Key activity statistics">
              <div className={styles.card}>
                <h2 className={styles.cardLabel}>Total Screen Time</h2>
                <p className={styles.cardValue}>{formatDuration(safeSummary.totalScreenSec)}</p>
                <span className={styles.cardSub}>
                  {Math.round(
                    (safeSummary.activeSec / (safeSummary.totalScreenSec || 1)) * 100,
                  )}
                  % active engagement
                </span>
              </div>
              <div className={styles.card}>
                <h2 className={styles.cardLabel}>Active Working Time</h2>
                <p className={styles.cardValue}>{formatDuration(safeSummary.activeSec)}</p>
                <span className={`${styles.cardSub} ${styles.positiveSub}`}>
                  ✓ Focused on core tasks
                </span>
              </div>
              <div className={styles.card}>
                <h2 className={styles.cardLabel}>Idle &amp; Breaks</h2>
                <p className={styles.cardValue}>{formatDuration(safeSummary.idleSec)}</p>
                <span className={styles.cardSub}>
                  {formatDuration(safeSummary.idleSec)} break time
                </span>
              </div>
              <div className={styles.card}>
                <h2 className={styles.cardLabel}>Task Switches</h2>
                <p className={styles.cardValue}>{formatNumber(safeSummary.switchCount)}</p>
                <span className={styles.cardSub}>
                  ~{Math.round(safeSummary.switchCount / 8)} switches / hour
                </span>
              </div>
              <div className={styles.card}>
                <h2 className={styles.cardLabel}>Notifications</h2>
                <p className={styles.cardValue}>{formatNumber(safeSummary.notificationCount)}</p>
                <span className={styles.cardSub}>Interruptions logged</span>
              </div>
            </section>

            <section className={styles.chartsGrid} aria-label="Visual analytics">
              <div className={styles.chartCard}>
                <h2 className={styles.chartTitle}>
                  <span>Category Distribution</span>
                  <span className={styles.chartSubTitle}>Time share</span>
                </h2>
                <CategoryDonutChart
                  categories={activeBreakdown as any}
                  totalSec={safeSummary.activeSec}
                />
              </div>

              <div className={styles.chartCard}>
                <h2 className={styles.chartTitle}>
                  <span>Hourly Timeline &amp; Task Switching</span>
                  <span className={styles.chartSubTitle}>Today (08:00 - 19:00)</span>
                </h2>
                <HourlyTimelineChart patterns={hourlyPatterns} />
              </div>
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
                      let current = 0;
                      let targetLabel = '';
                      let percent = 0;
                      let isReversed = false;
                      const targetVal = Number(g.targetValue) || 1;

                      if (g.type === 'focus_minutes') {
                        current = Math.round(safeSummary.activeSec / 60);
                        targetLabel = `${current}m / ${targetVal}m`;
                        percent = Math.min(100, Math.round((current / targetVal) * 100));
                      } else if (g.type === 'max_screen_minutes') {
                        current = Math.round(safeSummary.totalScreenSec / 60);
                        targetLabel = `${current}m / ${targetVal}m cap`;
                        percent = Math.min(100, Math.round((current / targetVal) * 100));
                        isReversed = true;
                      } else if (g.type === 'max_context_switches') {
                        current = safeSummary.switchCount;
                        targetLabel = `${current} / ${targetVal} max`;
                        percent = Math.min(100, Math.round((current / targetVal) * 100));
                        isReversed = true;
                      } else {
                        // Custom target (e.g. DSA, Reading)
                        current = Math.round(safeSummary.activeSec / 60);
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
                    {focusSessions.map((session, index) => (
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
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className={styles.twoColGrid} aria-label="Top applications and websites">
              <div className={styles.sectionCard}>
                <h2 className={styles.sectionTitle}>🌐 Top Websites &amp; Web Apps</h2>
                {topSites.length === 0 ? (
                  <p className={styles.emptySitesText}>No website usage tracked for this date.</p>
                ) : (
                  <ul className={styles.sitesList}>
                    {topSites.map((site, idx) => {
                      const siteRawName = site?.name || 'Unknown Website';
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
