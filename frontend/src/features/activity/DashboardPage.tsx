import { useState } from 'react';
import { useActivityReport } from './hooks';
import { formatDateTime, formatDuration, formatNumber, getTodayDateString, formatAppName } from '../../lib/format';
import { CategoryDonutChart } from '../../components/charts/CategoryDonutChart';
import { HourlyTimelineChart } from '../../components/charts/HourlyTimelineChart';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import styles from './DashboardPage.module.css';

export function DashboardPage() {
  const today = getTodayDateString();
  const [selectedDate, setSelectedDate] = useState(today);

  const { data: report, isLoading, isError } = useActivityReport(selectedDate);

  if (isLoading) {
    return <Spinner label="Loading dashboard report..." />;
  }

  if (isError || !report) {
    return (
      <div role="alert" className={styles.errorAlert}>
        Failed to load activity summary report.
      </div>
    );
  }

  const { summary, hourlyPatterns = [], categoryBreakdown, focusSessions = [], goals = [] } = report;

  const topApps = summary.topApps ?? [];

  const hasActivity =
    summary.totalScreenSec > 0 ||
    summary.switchCount > 0 ||
    summary.notificationCount > 0 ||
    summary.topSites.length > 0 ||
    topApps.length > 0;

  const maxSiteDuration =
    summary.topSites.length > 0 ? Math.max(...summary.topSites.map((s) => s.durationSec)) : 1;
  const maxAppDuration =
    topApps.length > 0 ? Math.max(...topApps.map((a) => a.durationSec)) : 1;

  const activeBreakdown = categoryBreakdown ?? {
    productive: 0,
    communication: 0,
    entertainment: 0,
    social: 0,
    other: 0,
  };

  const getDomainCategory = (domain: string): string => {
    if (
      domain.includes('github') ||
      domain.includes('chatgpt') ||
      domain.includes('claude') ||
      domain.includes('notion') ||
      domain.includes('linear') ||
      domain.includes('localhost')
    ) {
      return 'productive';
    }
    if (domain.includes('slack') || domain.includes('mail') || domain.includes('teams') || domain.includes('discord')) {
      return 'communication';
    }
    if (domain.includes('youtube') || domain.includes('netflix') || domain.includes('spotify')) {
      return 'entertainment';
    }
    if (domain.includes('reddit') || domain.includes('twitter') || domain.includes('instagram') || domain.includes('linkedin') || domain.includes('x.com')) {
      return 'social';
    }
    return 'other';
  };

  const getAppCategory = (appName: string): string => {
    const lower = appName.toLowerCase();
    if (
      lower.includes('code') ||
      lower.includes('cursor') ||
      lower.includes('terminal') ||
      lower.includes('notepad') ||
      lower.includes('word') ||
      lower.includes('excel') ||
      lower.includes('powerpnt') ||
      lower.includes('figma')
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
              <p className={styles.cardValue}>{formatDuration(summary.totalScreenSec)}</p>
              <span className={styles.cardSub}>
                {Math.round((summary.activeSec / (summary.totalScreenSec || 1)) * 100)}% active engagement
              </span>
            </div>
            <div className={styles.card}>
              <h2 className={styles.cardLabel}>Active Working Time</h2>
              <p className={styles.cardValue}>{formatDuration(summary.activeSec)}</p>
              <span className={`${styles.cardSub} ${styles.positiveSub}`}>
                ✓ Focused on core tasks
              </span>
            </div>
            <div className={styles.card}>
              <h2 className={styles.cardLabel}>Idle & Breaks</h2>
              <p className={styles.cardValue}>{formatDuration(summary.idleSec)}</p>
              <span className={styles.cardSub}>
                {formatDuration(summary.idleSec)} break time
              </span>
            </div>
            <div className={styles.card}>
              <h2 className={styles.cardLabel}>Task Switches</h2>
              <p className={styles.cardValue}>{formatNumber(summary.switchCount)}</p>
              <span className={styles.cardSub}>
                ~{Math.round(summary.switchCount / 8)} switches / hour
              </span>
            </div>
            <div className={styles.card}>
              <h2 className={styles.cardLabel}>Notifications</h2>
              <p className={styles.cardValue}>{formatNumber(summary.notificationCount)}</p>
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
                categories={activeBreakdown}
                totalSec={summary.activeSec}
              />
            </div>

            <div className={styles.chartCard}>
              <h2 className={styles.chartTitle}>
                <span>Hourly Timeline & Task Switching</span>
                <span className={styles.chartSubTitle}>Today (08:00 - 19:00)</span>
              </h2>
              <HourlyTimelineChart patterns={hourlyPatterns} />
            </div>
          </section>

          <section className={styles.twoColGrid}>
            <div className={styles.sectionCard}>
              <h2 className={styles.sectionTitle}>🎯 Daily Goal Targets</h2>
              {goals.length === 0 ? (
                <p className={styles.emptySitesText}>No active goals set yet. Go to Goals tab to configure.</p>
              ) : (
                <div className={styles.goalsList}>
                  {goals.map((g) => {
                    let current = 0;
                    let targetLabel = '';
                    let percent = 0;
                    let isReversed = false;

                    if (g.type === 'focus_minutes') {
                      current = Math.round(summary.activeSec / 60);
                      targetLabel = `${current}m / ${g.targetValue}m`;
                      percent = Math.min(100, Math.round((current / g.targetValue) * 100));
                    } else if (g.type === 'max_screen_minutes') {
                      current = Math.round(summary.totalScreenSec / 60);
                      targetLabel = `${current}m / ${g.targetValue}m cap`;
                      percent = Math.min(100, Math.round((current / g.targetValue) * 100));
                      isReversed = true;
                    } else if (g.type === 'max_context_switches') {
                      current = summary.switchCount;
                      targetLabel = `${current} / ${g.targetValue} max`;
                      percent = Math.min(100, Math.round((current / g.targetValue) * 100));
                      isReversed = true;
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
                          : 'Context Switch Budget';

                    return (
                      <div key={g.id} className={styles.goalItem}>
                        <div className={styles.goalHeader}>
                          <span className={styles.goalName}>{titleLabel}</span>
                          <span className={styles.goalNumbers}>{targetLabel} ({percent}%)</span>
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
              <h2 className={styles.sectionTitle}>⏱️ Focus & Session Tracking</h2>
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
                          Started at {formatDateTime(session.startedAt).split(',')[1] || session.startedAt}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className={`${styles.sessionStatus} ${styles.completedStatus}`}>
                          ✓ {session.status}
                        </span>
                        <div className={styles.goalNumbers} style={{ fontSize: '0.6875rem', marginTop: 2 }}>
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
              <h2 className={styles.sectionTitle}>🌐 Top Websites & Web Apps</h2>
              {summary.topSites.length === 0 ? (
                <p className={styles.emptySitesText}>No website usage tracked for this date.</p>
              ) : (
                <ul className={styles.sitesList}>
                  {summary.topSites.map((site) => {
                    const percentage = Math.round((site.durationSec / maxSiteDuration) * 100);
                    const category = site.category || getDomainCategory(site.name);
                    return (
                      <li key={site.name} className={styles.siteItem}>
                        <div className={styles.siteHeader}>
                          <div className={styles.siteTitleGroup}>
                            <span className={styles.siteName}>{formatAppName(site.name)}</span>
                            {formatAppName(site.name) !== site.name && (
                              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>({site.name})</span>
                            )}
                            <span className={`${styles.catBadge} ${styles[category] || styles.other}`}>
                              {category}
                            </span>
                          </div>
                          <span className={styles.siteDuration}>
                            {formatDuration(site.durationSec)}
                          </span>
                        </div>
                        <div
                          className={styles.barTrack}
                          role="progressbar"
                          aria-valuenow={percentage}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`Time spent on ${site.name}`}
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
                <p className={styles.emptySitesText}>No desktop application activity tracked for this date.</p>
              ) : (
                <ul className={styles.sitesList}>
                  {topApps.map((app) => {
                    const percentage = Math.round((app.durationSec / maxAppDuration) * 100);
                    const category = app.category || getAppCategory(app.name);
                    return (
                      <li key={app.name} className={styles.siteItem}>
                        <div className={styles.siteHeader}>
                          <div className={styles.siteTitleGroup}>
                            <span className={styles.siteName}>{formatAppName(app.name)}</span>
                            {formatAppName(app.name).toLowerCase() !== app.name.toLowerCase() && (
                              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>({app.name})</span>
                            )}
                            <span className={`${styles.catBadge} ${styles[category] || styles.other}`}>
                              {category}
                            </span>
                          </div>
                          <span className={styles.siteDuration}>
                            {formatDuration(app.durationSec)}
                          </span>
                        </div>
                        <div
                          className={styles.barTrack}
                          role="progressbar"
                          aria-valuenow={percentage}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`Time spent on ${app.name}`}
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
    </div>
  );
}
