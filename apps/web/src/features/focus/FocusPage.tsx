import { useEffect, useState } from 'react';
import {
  useActiveFocusSession,
  useFocusSessionsList,
  useStartFocusSession,
  useStopFocusSession,
} from './hooks';
import { formatDateTime, formatDuration } from '../../lib/format';
import { Spinner } from '../../components/ui/Spinner';
import styles from './FocusPage.module.css';

const PRESETS = [
  { label: '15m Sprint', minutes: 15 },
  { label: '25m Pomodoro', minutes: 25 },
  { label: '45m Deep Work', minutes: 45 },
  { label: '60m Flow State', minutes: 60 },
];

export function FocusPage() {
  const [selectedMinutes, setSelectedMinutes] = useState(25);
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);

  // Queries
  const { data: activeSession, isLoading: isActiveLoading } = useActiveFocusSession();
  const { data: sessionsList, isLoading: isListLoading } = useFocusSessionsList(15);

  // Mutations
  const startMutation = useStartFocusSession();
  const stopMutation = useStopFocusSession();

  const isSessionActive = Boolean(activeSession && activeSession.status === 'active');

  // Sync remaining seconds with active session or selected preset
  useEffect(() => {
    if (isSessionActive && activeSession) {
      const startMs = new Date(activeSession.startedAt).getTime();
      const totalSec = activeSession.plannedMin * 60;

      const updateClock = () => {
        const elapsedSec = Math.floor((Date.now() - startMs) / 1000);
        const rem = Math.max(0, totalSec - elapsedSec);
        setRemainingSeconds(rem);
      };

      updateClock();
      const interval = setInterval(updateClock, 1000);
      return () => clearInterval(interval);
    } else {
      setRemainingSeconds(selectedMinutes * 60);
    }
  }, [isSessionActive, activeSession, selectedMinutes]);

  const handleStart = () => {
    startMutation.mutate({ plannedMin: selectedMinutes });
  };

  const handleStop = (status: 'completed' | 'abandoned') => {
    if (!activeSession) return;
    stopMutation.mutate({ id: activeSession.id, payload: { status } });
  };

  // Clock math
  const displayMins = Math.floor(remainingSeconds / 60);
  const displaySecs = remainingSeconds % 60;
  const timeFormatted = `${String(displayMins).padStart(2, '0')}:${String(displaySecs).padStart(2, '0')}`;

  const totalDurationSec = (isSessionActive && activeSession ? activeSession.plannedMin : selectedMinutes) * 60;
  const progressRatio = totalDurationSec > 0 ? remainingSeconds / totalDurationSec : 1;
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progressRatio);

  const pastSessions = sessionsList?.items ?? [];

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>Focus Sessions &amp; Timer</h1>
        <p className={styles.subtitle}>
          Dedicated uninterrupted working blocks with active distraction tracking.
        </p>
      </header>

      {/* Main Timer Clock Card */}
      <section className={styles.timerCard} aria-label="Focus Timer Clock">
        {/* Presets (disabled when session is running) */}
        <div className={styles.presetGroup}>
          {PRESETS.map((p) => (
            <button
              key={p.minutes}
              type="button"
              disabled={isSessionActive}
              className={`${styles.presetBtn} ${selectedMinutes === p.minutes && !isSessionActive ? styles.activePreset : ''}`}
              onClick={() => {
                setSelectedMinutes(p.minutes);
                setRemainingSeconds(p.minutes * 60);
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Circular Clock Visualizer */}
        <div className={styles.clockContainer}>
          <svg className={styles.svgRing} viewBox="0 0 280 280">
            <circle
              className={styles.ringBg}
              cx="140"
              cy="140"
              r={radius}
            />
            <circle
              className={`${styles.ringProgress} ${isSessionActive ? styles.activeColor : ''}`}
              cx="140"
              cy="140"
              r={radius}
              style={{
                strokeDasharray: circumference,
                strokeDashoffset: strokeDashoffset,
              }}
            />
          </svg>

          {/* Clock Center Display */}
          <div className={styles.clockCenter}>
            <div className={`${styles.statusIndicator} ${isSessionActive ? styles.activePill : styles.idlePill}`}>
              {isSessionActive ? (
                <>
                  <span style={{ color: '#10b981' }}>●</span> Focus Active
                </>
              ) : (
                'Ready to Focus'
              )}
            </div>
            <div className={styles.timeText}>{timeFormatted}</div>
            <div className={styles.timeSubtext}>
              {isSessionActive
                ? `Planned: ${activeSession?.plannedMin} mins`
                : `${selectedMinutes} minutes session`}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className={styles.controlsRow}>
          {!isSessionActive ? (
            <button
              type="button"
              className={styles.startBtn}
              onClick={handleStart}
              disabled={startMutation.isPending || isActiveLoading}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              <span>{startMutation.isPending ? 'Starting...' : 'Start Focus Session'}</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                className={styles.completeBtn}
                onClick={() => handleStop('completed')}
                disabled={stopMutation.isPending}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>{stopMutation.isPending ? 'Saving...' : 'Complete Session'}</span>
              </button>

              <button
                type="button"
                className={styles.abandonBtn}
                onClick={() => handleStop('abandoned')}
                disabled={stopMutation.isPending}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                <span>End Early</span>
              </button>
            </>
          )}
        </div>
      </section>

      {/* Focus History Log */}
      <section className={styles.historyCard} aria-label="Recent Focus Sessions History">
        <h2 className={styles.historyTitle}>Recent Focus Sessions</h2>

        {isListLoading ? (
          <div style={{ padding: '2rem' }}>
            <Spinner label="Loading focus sessions..." />
          </div>
        ) : pastSessions.length === 0 ? (
          <div className={styles.emptyHistory}>
            No focus sessions recorded yet. Start your first session above!
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Started At</th>
                  <th>Planned</th>
                  <th>Interruptions</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pastSessions.map((s) => (
                  <tr key={s.id}>
                    <td>{formatDateTime(s.startedAt)}</td>
                    <td>{formatDuration(s.plannedMin * 60)}</td>
                    <td>
                      {s.interruptionCount > 0 ? (
                        <span style={{ color: '#b91c1c' }}>{s.interruptionCount} context switches</span>
                      ) : (
                        <span style={{ color: '#15803d' }}>0 (Deep focus)</span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`${styles.statusTag} ${
                          s.status === 'completed'
                            ? styles.completedTag
                            : s.status === 'active'
                              ? styles.activeTag
                              : styles.abandonedTag
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
