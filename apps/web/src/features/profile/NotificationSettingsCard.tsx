import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../../api/notifications';
import { Spinner } from '../../components/ui/Spinner';
import styles from './NotificationSettingsCard.module.css';

export function NotificationSettingsCard() {
  const queryClient = useQueryClient();
  const [success, setSuccess] = useState<string | null>(null);

  const { data: prefs, isLoading } = useQuery({
    queryKey: ['notifications', 'preferences'],
    queryFn: () => notificationsApi.getPreferences(),
  });

  const [distractionAlerts, setDistractionAlerts] = useState(true);
  const [breakReminders, setBreakReminders] = useState(true);
  const [focusSessionAlerts, setFocusSessionAlerts] = useState(true);
  const [weeklyReportAlerts, setWeeklyReportAlerts] = useState(true);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietHoursStart, setQuietHoursStart] = useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('08:00');

  useEffect(() => {
    if (prefs) {
      setDistractionAlerts(prefs.distractionAlerts);
      setBreakReminders(prefs.breakReminders);
      setFocusSessionAlerts(prefs.focusSessionAlerts);
      setWeeklyReportAlerts(prefs.weeklyReportAlerts);
      setQuietHoursEnabled(prefs.quietHoursEnabled);
      setQuietHoursStart(prefs.quietHoursStart);
      setQuietHoursEnd(prefs.quietHoursEnd);
    }
  }, [prefs]);

  const updateMutation = useMutation({
    mutationFn: () =>
      notificationsApi.updatePreferences({
        distractionAlerts,
        breakReminders,
        focusSessionAlerts,
        weeklyReportAlerts,
        quietHoursEnabled,
        quietHoursStart,
        quietHoursEnd,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'preferences'] });
      setSuccess('✓ Notification preferences saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    },
  });

  if (isLoading) {
    return (
      <div className={styles.card} style={{ textAlign: 'center', padding: '1.5rem' }}>
        <Spinner label="Loading notification preferences..." size="sm" />
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.iconBox} aria-hidden="true">
          🔔
        </div>
        <div>
          <h3 className={styles.title}>Notification Intelligence &amp; Quiet Hours</h3>
          <p className={styles.subtitle}>
            Control automated cognitive nudges, distraction threshold alerts, and silence schedules.
          </p>
        </div>
      </div>

      <div className={styles.togglesList}>
        {/* 1. Distraction Alerts */}
        <div className={styles.toggleRow}>
          <div className={styles.toggleInfo}>
            <span className={styles.toggleTitle}>Distraction Alerts</span>
            <span className={styles.toggleDesc}>
              Notify when context switching spikes or sustained unclassified distraction exceeds thresholds.
            </span>
          </div>
          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={distractionAlerts}
              onChange={(e) => setDistractionAlerts(e.target.checked)}
            />
            <span className={styles.slider} />
          </label>
        </div>

        {/* 2. Break Reminders */}
        <div className={styles.toggleRow}>
          <div className={styles.toggleInfo}>
            <span className={styles.toggleTitle}>Restorative Break Reminders</span>
            <span className={styles.toggleDesc}>
              Prompt brief 5m cognitive resets after prolonged uninterrupted work sessions.
            </span>
          </div>
          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={breakReminders}
              onChange={(e) => setBreakReminders(e.target.checked)}
            />
            <span className={styles.slider} />
          </label>
        </div>

        {/* 3. Focus Session Alerts */}
        <div className={styles.toggleRow}>
          <div className={styles.toggleInfo}>
            <span className={styles.toggleTitle}>Focus Session Completion Alerts</span>
            <span className={styles.toggleDesc}>
              Audio and banner signals when a planned focus block completes or is interrupted.
            </span>
          </div>
          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={focusSessionAlerts}
              onChange={(e) => setFocusSessionAlerts(e.target.checked)}
            />
            <span className={styles.slider} />
          </label>
        </div>

        {/* 4. Weekly Report Alerts */}
        <div className={styles.toggleRow}>
          <div className={styles.toggleInfo}>
            <span className={styles.toggleTitle}>Weekly Attention Report Alerts</span>
            <span className={styles.toggleDesc}>
              Receive weekly aggregate attention trends and habit formation diagnostics.
            </span>
          </div>
          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={weeklyReportAlerts}
              onChange={(e) => setWeeklyReportAlerts(e.target.checked)}
            />
            <span className={styles.slider} />
          </label>
        </div>

        {/* 5. Quiet Hours */}
        <div className={styles.quietHoursBox}>
          <div className={styles.toggleRow} style={{ padding: 0 }}>
            <div className={styles.toggleInfo}>
              <span className={styles.toggleTitle}>Enable Quiet Hours Schedule</span>
              <span className={styles.toggleDesc}>
                Mute all non-critical notifications during sleep or focus recharge blocks.
              </span>
            </div>
            <label className={styles.switch}>
              <input
                type="checkbox"
                checked={quietHoursEnabled}
                onChange={(e) => setQuietHoursEnabled(e.target.checked)}
              />
              <span className={styles.slider} />
            </label>
          </div>

          {quietHoursEnabled && (
            <div className={styles.timeInputsRow}>
              <div className={styles.timeInputGroup}>
                <label htmlFor="quiet-start">Start Time:</label>
                <input
                  id="quiet-start"
                  type="time"
                  className={styles.timeInput}
                  value={quietHoursStart}
                  onChange={(e) => setQuietHoursStart(e.target.value)}
                />
              </div>

              <div className={styles.timeInputGroup}>
                <label htmlFor="quiet-end">End Time:</label>
                <input
                  id="quiet-end"
                  type="time"
                  className={styles.timeInput}
                  value={quietHoursEnd}
                  onChange={(e) => setQuietHoursEnd(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {success && (
        <div style={{ marginTop: '1rem', color: '#10b981', fontSize: '0.82rem', fontWeight: 600 }}>
          {success}
        </div>
      )}

      <button
        type="button"
        className={styles.saveBtn}
        onClick={() => updateMutation.mutate()}
        disabled={updateMutation.isPending}
      >
        {updateMutation.isPending ? 'Saving...' : 'Save Preferences'}
      </button>
    </div>
  );
}

