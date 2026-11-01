import { useState, useRef, useEffect } from 'react';
import { useWeeklyFocusSummary } from './hooks';
import { formatDuration } from '../../lib/format';
import styles from './FocusSummaryWidget.module.css';

interface FocusSummaryWidgetProps {
  selectedDate?: string;
}

export function FocusSummaryWidget({ selectedDate }: FocusSummaryWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError } = useWeeklyFocusSummary(selectedDate);

  // Close on Escape key or clicking outside
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }

    function handlePointerDown(e: MouseEvent | TouchEvent) {
      if (widgetRef.current && !widgetRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handlePointerDown);
      document.addEventListener('touchstart', handlePointerDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isOpen]);

  const today = data?.today;
  const weeklyAverage = data?.weeklyAverage;
  const days = data?.days ?? [];

  // Determine short score text for the collapsed button
  let buttonScoreText = 'No activity recorded yet';
  let hasValidScore = false;

  if (isLoading) {
    buttonScoreText = 'Loading...';
  } else if (isError || !data) {
    buttonScoreText = 'Unavailable';
  } else if (today?.hasData && today.focusScore !== null) {
    buttonScoreText = `Focus: ${today.focusScore}/100`;
    hasValidScore = true;
  }

  // Determine status style badge
  const getStatusClass = (status?: string) => {
    switch (status) {
      case 'Good Focus':
        return styles.statusGood;
      case 'Moderate Focus':
        return styles.statusModerate;
      case 'Needs Improvement':
        return styles.statusNeedsImprovement;
      default:
        return styles.statusNoData;
    }
  };

  const getScoreBarFillClass = (score: number) => {
    if (score >= 70) return styles.dayBarFillGood;
    if (score >= 50) return styles.dayBarFillModerate;
    return styles.dayBarFillLow;
  };

  return (
    <div className={styles.container} ref={widgetRef}>
      {/* 1. Small Focus Summary Box (Fixed bottom-left) */}
      <button
        type="button"
        className={`${styles.triggerButton} ${isOpen ? styles.isOpen : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label="Toggle My Focus summary"
        id="my-focus-widget-trigger"
      >
        <div className={styles.iconWrapper} aria-hidden="true">
          <svg
            className={styles.iconSvg}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
        </div>

        <div className={styles.triggerContent}>
          <span className={styles.triggerLabel}>My Focus</span>
          <span
            className={`${styles.triggerScore} ${
              hasValidScore ? styles.triggerScoreHasData : ''
            }`}
          >
            {buttonScoreText}
          </span>
        </div>

        <svg
          className={styles.chevronIcon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>

      {/* 2. Open Summary Panel */}
      {isOpen && (
        <div
          className={styles.panel}
          role="dialog"
          aria-modal="true"
          aria-labelledby="my-focus-panel-title"
          id="my-focus-summary-panel"
        >
          {/* Header */}
          <div className={styles.panelHeader}>
            <div className={styles.panelTitleGroup}>
              <div className={styles.iconWrapper} style={{ width: 22, height: 22 }} aria-hidden="true">
                <svg
                  className={styles.iconSvg}
                  style={{ width: 12, height: 12 }}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                </svg>
              </div>
              <h2 className={styles.panelTitle} id="my-focus-panel-title">
                My Focus Summary
              </h2>
            </div>
            <button
              type="button"
              className={styles.closeButton}
              onClick={() => setIsOpen(false)}
              aria-label="Close focus summary"
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
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Panel Content */}
          <div className={styles.panelContent}>
            {isLoading && (
              <div className={styles.stateBox}>
                <div className={styles.spinner} role="status" aria-label="Loading" />
                <span>Loading your focus metrics...</span>
              </div>
            )}

            {isError && (
              <div className={styles.stateBox}>
                <span className={styles.errorText}>
                  Unable to load focus summary. Please try again.
                </span>
              </div>
            )}

            {!isLoading && !isError && today && (
              <>
                {/* Today's Focus Score & Simple Status */}
                <div className={styles.scoreCard}>
                  <div className={styles.scoreInfo}>
                    <span className={styles.scoreLabel}>Today's Focus Score</span>
                    {today.hasData && today.focusScore !== null ? (
                      <div className={styles.scoreValue}>
                        {today.focusScore}
                        <span className={styles.scoreTotal}> / 100</span>
                      </div>
                    ) : (
                      <span className={styles.noActivityNotice}>
                        No activity recorded yet
                      </span>
                    )}
                  </div>

                  <div
                    className={`${styles.statusBadge} ${getStatusClass(today.status)}`}
                  >
                    <span>{today.status}</span>
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div className={styles.metricsGrid}>
                  {/* Weekly Average */}
                  <div className={styles.metricTile}>
                    <span className={styles.metricTileTitle}>Weekly Average</span>
                    <span className={styles.metricTileValue}>
                      {weeklyAverage !== null ? `${weeklyAverage} / 100` : 'No activity recorded yet'}
                    </span>
                    <span className={styles.metricTileSubtext}>
                      {data.daysWithDataCount > 0
                        ? `Based on ${data.daysWithDataCount} tracked ${
                            data.daysWithDataCount === 1 ? 'day' : 'days'
                          }`
                        : 'No tracked days this week'}
                    </span>
                  </div>

                  {/* Today's Screen Time */}
                  <div className={styles.metricTile}>
                    <span className={styles.metricTileTitle}>Today's Screen Time</span>
                    <span className={styles.metricTileValue}>
                      {today.hasData || today.totalScreenMinutes > 0
                        ? formatDuration(today.totalScreenMinutes * 60)
                        : '0 min'}
                    </span>
                    <span className={styles.metricTileSubtext}>
                      Active: {formatDuration(today.activeMinutes * 60)}
                    </span>
                  </div>

                  {/* Distraction Summary */}
                  <div className={styles.metricTile}>
                    <span className={styles.metricTileTitle}>Distraction Summary</span>
                    <span className={styles.metricTileValue}>
                      {today.hasData
                        ? `${today.switchCount} app ${
                            today.switchCount === 1 ? 'switch' : 'switches'
                          }`
                        : 'No activity recorded yet'}
                    </span>
                    <span className={styles.metricTileSubtext}>
                      {today.distractedMinutes > 0
                        ? `${today.distractedMinutes} min distracted`
                        : today.hasData
                        ? 'Zero distracted minutes'
                        : 'No tracked activity'}
                    </span>
                  </div>

                  {/* Focus Sessions */}
                  <div className={styles.metricTile}>
                    <span className={styles.metricTileTitle}>Focus Sessions</span>
                    <span className={styles.metricTileValue}>
                      {today.completedFocusSessions} completed
                    </span>
                    <span className={styles.metricTileSubtext}>Recorded today</span>
                  </div>
                </div>

                {/* 3. Simple Weekly View (Monday - Sunday) */}
                <div className={styles.weeklySection}>
                  <div className={styles.weeklySectionHeader}>
                    <span className={styles.weeklyTitle}>This Week (Mon – Sun)</span>
                    <span className={styles.weeklyAverageLabel}>
                      Avg:{' '}
                      <span className={styles.weeklyAverageValue}>
                        {weeklyAverage !== null ? `${weeklyAverage}/100` : '—'}
                      </span>
                    </span>
                  </div>

                  <ul className={styles.weeklyList}>
                    {days.map((dayItem) => {
                      const hasDayScore = dayItem.hasData && dayItem.score !== null;

                      return (
                        <li
                          key={dayItem.date}
                          className={`${styles.weeklyDayRow} ${
                            dayItem.isToday ? styles.todayRow : ''
                          }`}
                        >
                          <div className={styles.dayNameGroup}>
                            <span className={styles.dayName}>{dayItem.day}</span>
                            {dayItem.isToday && (
                              <span className={styles.todayPill}>Today</span>
                            )}
                          </div>

                          <div
                            className={styles.dayBarTrack}
                            role="progressbar"
                            aria-valuenow={hasDayScore ? dayItem.score! : 0}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${dayItem.day} focus score`}
                          >
                            {hasDayScore && (
                              <div
                                className={`${styles.dayBarFill} ${getScoreBarFillClass(
                                  dayItem.score!
                                )}`}
                                style={{ width: `${dayItem.score}%` }}
                              />
                            )}
                          </div>

                          <div className={styles.dayScoreLabel}>
                            {hasDayScore ? (
                              `${dayItem.score}/100`
                            ) : (
                              <span className={styles.dayNoDataLabel}>—</span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
