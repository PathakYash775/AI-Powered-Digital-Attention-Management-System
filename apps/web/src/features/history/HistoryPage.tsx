import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { activityApi } from '../../api/activity';
import type { HistoryDayItem } from '../../api/types';
import { Spinner } from '../../components/ui/Spinner';
import styles from './HistoryPage.module.css';

function formatDuration(totalSec: number): string {
  if (!totalSec || totalSec <= 0) return '0s';
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  }
  return `${seconds}s`;
}

function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function HistoryPage() {
  const [daysWindow, setDaysWindow] = useState<number>(14);
  const [showEmptyDays, setShowEmptyDays] = useState<boolean>(false);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  const { data: historyData, isLoading } = useQuery({
    queryKey: ['activity', 'history', daysWindow],
    queryFn: () => activityApi.getHistory(daysWindow),
    staleTime: 30_000,
  });

  const toggleDayExpanded = (dateStr: string) => {
    setExpandedDays((prev) => ({
      ...prev,
      [dateStr]: !prev[dateStr],
    }));
  };

  const rawDays: HistoryDayItem[] = historyData?.days || [];
  const visibleDays = rawDays.filter((day) => showEmptyDays || day.hasData);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>History</h1>
        <p className={styles.subtitle}>
          Your past days at a glance. Open a day to see its focus sessions and everything recorded on it.
        </p>
      </div>

      {/* Filter Control Card */}
      <div className={styles.filterCard}>
        <div className={styles.filterGroup}>
          <label htmlFor="period-select" className={styles.filterLabel}>
            Period
          </label>
          <select
            id="period-select"
            className={styles.selectInput}
            value={daysWindow}
            onChange={(e) => setDaysWindow(Number(e.target.value))}
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        </div>

        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            className={styles.checkboxInput}
            checked={showEmptyDays}
            onChange={(e) => setShowEmptyDays(e.target.checked)}
          />
          <span>Show days with nothing recorded</span>
        </label>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className={styles.emptyState}>
          <Spinner label="Loading telemetry history..." size="md" />
        </div>
      ) : visibleDays.length === 0 ? (
        <div className={styles.emptyState}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <p>No activity records found for this period.</p>
        </div>
      ) : (
        /* History Days Rows */
        <div className={styles.historyList}>
          {visibleDays.map((day) => {
            const isExpanded = Boolean(expandedDays[day.date]);
            const focusSessionsLabel = `${day.focusSessionsCount} session${day.focusSessionsCount === 1 ? '' : 's'}`;
            const switchesLabel = `${day.switchCount} switch${day.switchCount === 1 ? '' : 'es'}`;

            return (
              <div
                key={day.date}
                className={`${styles.dayCard} ${isExpanded ? styles.dayCardOpen : ''}`}
              >
                {/* Clickable Header Row */}
                <button
                  type="button"
                  className={styles.dayRowHeader}
                  onClick={() => toggleDayExpanded(day.date)}
                  aria-expanded={isExpanded}
                  aria-label={`Toggle history details for ${day.label}`}
                >
                  {/* Date Column */}
                  <div className={styles.dateCol}>
                    <span>{day.label}</span>
                    {day.label === 'Today' && <span className={styles.todayBadge}>Active</span>}
                  </div>

                  {/* Focus Metric Column */}
                  <div className={styles.metricCol}>
                    <span className={styles.metricLabel}>Focus</span>
                    <span className={styles.metricValue}>
                      {formatDuration(day.focusSec)} · {focusSessionsLabel}
                    </span>
                  </div>

                  {/* Screen Time Column */}
                  <div className={styles.metricCol}>
                    <span className={styles.metricLabel}>Screen Time</span>
                    <span className={styles.metricValue}>
                      {formatDuration(day.screenTimeSec)}
                    </span>
                  </div>

                  {/* Records Column */}
                  <div className={styles.metricCol}>
                    <span className={styles.metricLabel}>Records</span>
                    <span className={styles.metricValue}>
                      {day.recordCount} · {switchesLabel}
                    </span>
                  </div>

                  {/* Expand Chevron Icon */}
                  <div
                    className={`${styles.arrowCol} ${isExpanded ? styles.arrowColRotated : ''}`}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </button>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div className={styles.expandedDetails}>
                    {/* Focus Sessions in Day */}
                    <div className={styles.detailSection}>
                      <span className={styles.detailHeading}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        Focus Sessions ({day.focusSessions.length})
                      </span>

                      {day.focusSessions.length === 0 ? (
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-sidebar-muted)' }}>
                          No focus sessions recorded on this day.
                        </span>
                      ) : (
                        <div className={styles.sessionsGrid}>
                          {day.focusSessions.map((session, sIdx) => {
                            const statusCls =
                              session.status === 'completed'
                                ? styles.statusCompleted
                                : session.status === 'abandoned'
                                ? styles.statusAbandoned
                                : styles.statusActive;

                            return (
                              <div key={session.id || sIdx} className={styles.sessionCard}>
                                <div className={styles.sessionCardTop}>
                                  <span className={styles.sessionTitle}>
                                    Session #{sIdx + 1}
                                  </span>
                                  <span className={`${styles.sessionStatus} ${statusCls}`}>
                                    {session.status}
                                  </span>
                                </div>
                                <div className={styles.sessionMeta}>
                                  <span>{session.durationMin}m focused</span>
                                  <span>Planned: {session.plannedMin}m</span>
                                  {session.startedAt && <span>{formatTime(session.startedAt)}</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Top Activities in Day */}
                    <div className={styles.detailSection}>
                      <span className={styles.detailHeading}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect width="18" height="18" x="3" y="3" rx="2" />
                          <line x1="3" y1="9" x2="21" y2="9" />
                          <line x1="9" y1="21" x2="9" y2="9" />
                        </svg>
                        Top Recorded Platforms &amp; Apps
                      </span>

                      {day.topActivities.length === 0 ? (
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-sidebar-muted)' }}>
                          No application telemetry entries logged for this date.
                        </span>
                      ) : (
                        <div className={styles.activitiesRow}>
                          {day.topActivities.map((act, aIdx) => (
                            <div key={aIdx} className={styles.activityPill}>
                              <span>{act.name}</span>
                              <span className={styles.activityDuration}>
                                {formatDuration(act.durationSec)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
