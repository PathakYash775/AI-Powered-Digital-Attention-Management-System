import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../../api/notifications';
import type { SmartAlert } from '../../api/types';
import styles from './NotificationBell.module.css';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();

  // 1. Fetch smart alerts
  const { data: alerts = [] } = useQuery<SmartAlert[]>({
    queryKey: ['notifications', 'alerts'],
    queryFn: () => notificationsApi.getAlerts(),
    refetchInterval: 15_000,
  });

  // 2. Evaluate mutation
  const evalMutation = useMutation({
    mutationFn: () => notificationsApi.evaluateAlerts(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'alerts'] });
    },
  });

  // 3. Mark read mutation
  const readMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAlertRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'alerts'] });
    },
  });

  // 4. Mark all read mutation
  const readAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'alerts'] });
    },
  });

  // 5. Delete alert mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.deleteAlert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'alerts'] });
    },
  });

  // Request browser notification permission on interaction
  const requestBrowserPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const alertList = Array.isArray(alerts) ? alerts : [];
  const unreadCount = alertList.filter((a) => !a.read).length;

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'urgent':
        return '🚨';
      case 'warning':
        return '⚠️';
      default:
        return '💡';
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  };

  return (
    <div className={styles.bellWrapper} ref={containerRef}>
      <button
        type="button"
        className={styles.bellBtn}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Smart notifications"
        title="View smart reminders and distraction alerts"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className={styles.dropdown} role="dialog" aria-label="Notifications panel">
          <div className={styles.dropdownHeader}>
            <span className={styles.dropdownTitle}>
              <span>Smart Alerts</span>
              {unreadCount > 0 && (
                <span style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 600 }}>
                  ({unreadCount} unread)
                </span>
              )}
            </span>

            <div style={{ display: 'flex', gap: 6 }}>
              {unreadCount > 0 && (
                <button
                  type="button"
                  className={styles.evalBtn}
                  onClick={() => readAllMutation.mutate()}
                  disabled={readAllMutation.isPending}
                  title="Mark all alerts as read"
                >
                  Mark all read
                </button>
              )}
              <button
                type="button"
                className={styles.evalBtn}
                onClick={() => {
                  void requestBrowserPermission();
                  evalMutation.mutate();
                }}
                disabled={evalMutation.isPending}
                title="Evaluate current focus and context switch telemetry"
              >
                {evalMutation.isPending ? 'Checking...' : '⚡ Check'}
              </button>
            </div>
          </div>

          <div className={styles.alertsList}>
            {alertList.length === 0 ? (
              <div className={styles.emptyAlerts}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>🎯</div>
                <div>All quiet! No distraction alerts.</div>
              </div>
            ) : (
              alertList.map((alert) => (
                <div
                  key={alert.id}
                  className={`${styles.alertItem} ${!alert.read ? styles.unreadItem : ''}`}
                >
                  <span className={styles.severityIcon} aria-hidden="true">
                    {getSeverityIcon(alert.severity)}
                  </span>
                  <div className={styles.alertContent}>
                    <div className={styles.alertTitleRow}>
                      <span className={styles.alertTitle}>{alert.title}</span>
                      <span className={styles.alertTime}>{formatTimeAgo(alert.createdAt)}</span>
                    </div>
                    <p className={styles.alertMsg}>{alert.message}</p>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                      {!alert.read && (
                        <button
                          type="button"
                          className={styles.markReadBtn}
                          onClick={() => readMutation.mutate(alert.id)}
                        >
                          Mark as read
                        </button>
                      )}
                      <button
                        type="button"
                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.75rem', padding: '2px 6px' }}
                        onClick={() => deleteMutation.mutate(alert.id)}
                        title="Dismiss alert"
                      >
                        ✕ Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
