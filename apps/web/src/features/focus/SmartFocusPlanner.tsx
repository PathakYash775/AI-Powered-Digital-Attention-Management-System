import { useQuery } from '@tanstack/react-query';
import { focusApi } from '../../api/focus';
import { Spinner } from '../../components/ui/Spinner';
import styles from './SmartFocusPlanner.module.css';

interface SmartFocusPlannerProps {
  onApplyDuration: (minutes: number) => void;
  onStartWithDuration: (minutes: number) => void;
  isSessionActive: boolean;
}

export function SmartFocusPlanner({
  onApplyDuration,
  onStartWithDuration,
  isSessionActive,
}: SmartFocusPlannerProps) {
  const { data: plan, isLoading } = useQuery({
    queryKey: ['focus', 'planner'],
    queryFn: () => focusApi.getSmartPlan(),
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className={styles.plannerCard} style={{ textAlign: 'center', padding: '2rem' }}>
        <Spinner label="Analyzing focus telemetry to formulate optimal work plan..." size="sm" />
      </div>
    );
  }

  const optimalDuration = plan?.optimalDuration ?? 25;
  const breakInfo = plan?.breakSuggestion ?? {
    type: 'micro',
    durationMinutes: 5,
    activity: 'Stand up, hydrate, and relax your eyes away from digital screens.',
    reason: 'Regular micro-breaks maintain high prefrontal cognitive stamina.',
  };
  const windows = plan?.highFocusWindows?.length ? plan.highFocusWindows : ['09:00 - 11:30 (Morning Deep Work)'];
  const priorities = plan?.taskPriorities?.length
    ? plan.taskPriorities
    : ['High-cognition analytical work', 'Complex coding & debugging', 'Minimize notification checks'];

  return (
    <section className={styles.plannerCard} aria-label="Smart Focus Planner">
      <div className={styles.plannerHeader}>
        <div className={styles.titleArea}>
          <div className={styles.iconBadge} aria-hidden="true">
            🎯
          </div>
          <div>
            <h2 className={styles.title}>Smart Focus Planner &amp; Schedule</h2>
            <p className={styles.subtitle}>
              AI-calibrated session durations and restorative breaks customized to your cognitive stamina.
            </p>
          </div>
        </div>

        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #64748b)', fontWeight: 600 }}>
          Today Completed: <span style={{ color: 'var(--color-primary, #7047eb)' }}>{plan?.sessionsCompletedToday ?? 0}</span> sessions
        </div>
      </div>

      <div className={styles.grid}>
        {/* 1. Optimal Work Session Duration */}
        <div className={styles.planBox}>
          <div>
            <div className={styles.boxHeader}>
              <span className={styles.boxLabel}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Recommended Duration
              </span>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#10b981',
                  background: 'rgba(16, 217, 149, 0.15)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '4px',
                }}
              >
                AI Optimized
              </span>
            </div>

            <div className={styles.optimalDurationText}>{optimalDuration} Minutes</div>
            <p className={styles.planText}>{plan?.durationReason || 'Optimal length based on your recent context switch rate.'}</p>
          </div>

          <div className={applyBtnRowStyle(styles.applyBtnRow)}>
            <button
              type="button"
              disabled={isSessionActive}
              className={`${styles.applyBtn} ${styles.applyBtnSecondary}`}
              onClick={() => onApplyDuration(optimalDuration)}
              title="Set timer to this recommended duration"
            >
              Set Preset
            </button>
            <button
              type="button"
              disabled={isSessionActive}
              className={styles.applyBtn}
              onClick={() => onStartWithDuration(optimalDuration)}
              title="Start session immediately with recommended duration"
            >
              ⚡ Start Now
            </button>
          </div>
        </div>

        {/* 2. Break Scheduling Suggestion */}
        <div className={styles.planBox}>
          <div>
            <div className={styles.boxHeader}>
              <span className={styles.boxLabel}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                  <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                  <line x1="6" y1="1" x2="6" y2="4" />
                  <line x1="10" y1="1" x2="10" y2="4" />
                  <line x1="14" y1="1" x2="14" y2="4" />
                </svg>
                Restorative Break Strategy
              </span>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: '#3b82f6',
                  background: 'rgba(59, 130, 246, 0.12)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '4px',
                  textTransform: 'capitalize',
                }}
              >
                {breakInfo.durationMinutes}m {breakInfo.type}
              </span>
            </div>

            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary, #0f172a)', margin: '0.4rem 0 0.2rem' }}>
              {breakInfo.activity}
            </div>
            <p className={styles.planText}>{breakInfo.reason}</p>
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #64748b)', fontStyle: 'italic', marginTop: 'auto' }}>
            Tip: Schedule this break right when your current session finishes.
          </div>
        </div>

        {/* 3. High Focus Windows & Priorities */}
        <div className={styles.planBox}>
          <div>
            <div className={styles.boxHeader}>
              <span className={styles.boxLabel}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                Peak Cognitive Windows
              </span>
            </div>

            <div className={styles.tagList}>
              {windows.map((win: any, idx: number) => {
                const winLabel =
                  typeof win === 'string'
                    ? win
                    : win?.label
                    ? `${win.start || `${win.startHour}:00`} - ${win.end || `${win.endHour}:00`} (${win.label})`
                    : typeof win === 'object' && win !== null
                    ? win.label || `${win.start || win.startHour || ''} - ${win.end || win.endHour || ''}`
                    : String(win);
                return (
                  <div key={idx} className={styles.windowTag}>
                    <span style={{ color: 'var(--color-primary, #7047eb)' }}>⚡</span>
                    <span>{winLabel}</span>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: '0.8rem' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary, #64748b)', textTransform: 'uppercase' }}>
                Priority Work Focus
              </span>
              <ul className={styles.priorityList}>
                {priorities.slice(0, 2).map((item: any, i: number) => {
                  const itemLabel =
                    typeof item === 'string'
                      ? item
                      : typeof item === 'object' && item !== null
                      ? `${item.title || 'Deep Work Focus'} (${item.suggestedBlockMin || optimalDuration || 25}m · ${item.priority || 'high'} priority)`
                      : String(item);
                  return (
                    <li key={i} className={styles.priorityItem}>
                      <span className={styles.priorityNumber}>{i + 1}</span>
                      <span>{itemLabel}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function applyBtnRowStyle(base: string) {
  return base;
}

