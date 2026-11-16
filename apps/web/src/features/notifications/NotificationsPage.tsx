import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { notificationsApi } from '../../api/notifications';
import type { SmartAlert } from '../../api/types';
import { Spinner } from '../../components/ui/Spinner';
import styles from './NotificationsPage.module.css';

function formatTimestamp(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoStr;
  }
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showUnreadOnly, setShowUnreadOnly] = useState<boolean>(false);

  const { data: alertsData, isLoading } = useQuery({
    queryKey: ['notifications', 'alerts'],
    queryFn: () => notificationsApi.getAlerts(),
    staleTime: 10_000,
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const clearReadMutation = useMutation({
    mutationFn: () => notificationsApi.clearRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markOneReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAlertRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteAlertMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.deleteAlert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleOpenAction = (alert: SmartAlert) => {
    // If not read, mark it read
    if (!alert.read) {
      markOneReadMutation.mutate(alert.id);
    }

    const typeStr = (alert.type || '').toLowerCase();
    const titleStr = (alert.title || '').toLowerCase();

    if (typeStr.includes('focus') || titleStr.includes('focus')) {
      navigate('/focus');
    } else if (typeStr.includes('habit') || titleStr.includes('habit') || typeStr.includes('goal')) {
      navigate('/goals');
    } else {
      navigate('/activity');
    }
  };

  const allAlerts: SmartAlert[] = Array.isArray(alertsData) ? alertsData : [];
  const visibleAlerts = showUnreadOnly ? allAlerts.filter((a) => !a.read) : allAlerts;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Notifications</h1>
          <p className={styles.subtitle}>
            Deadline, habit, focus and break reminders for your account.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending || allAlerts.length === 0}
          >
            Mark all as read
          </button>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => clearReadMutation.mutate()}
            disabled={clearReadMutation.isPending || allAlerts.length === 0}
          >
            Clear read
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={styles.filterCard}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            className={styles.checkboxInput}
            checked={showUnreadOnly}
            onChange={(e) => setShowUnreadOnly(e.target.checked)}
          />
          <span>Show unread only</span>
        </label>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-sidebar-muted)' }}>
          {visibleAlerts.length} notification{visibleAlerts.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* List */}
      {isLoading ? (
        <div className={styles.emptyState}>
          <Spinner label="Loading notifications..." size="md" />
        </div>
      ) : visibleAlerts.length === 0 ? (
        <div className={styles.emptyState}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <p>
            {showUnreadOnly
              ? 'No unread notifications. You are all caught up!'
              : 'No notifications at this moment.'}
          </p>
        </div>
      ) : (
        <div className={styles.notificationsList}>
          {visibleAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`${styles.notificationCard} ${
                !alert.read ? styles.notificationCardUnread : ''
              }`}
            >
              <div className={styles.cardLeft}>
                <div className={styles.titleRow}>
                  <span className={styles.cardTitle}>{alert.title}</span>
                  {!alert.read && <span className={styles.newBadge}>New</span>}
                </div>

                <p className={styles.cardMessage}>{alert.message}</p>

                <div className={styles.metaRow}>
                  <span>{formatTimestamp(alert.createdAt)}</span>
                  <span>·</span>
                  <button
                    type="button"
                    className={styles.openLink}
                    onClick={() => handleOpenAction(alert)}
                  >
                    Open
                  </button>
                </div>
              </div>

              <div className={styles.cardActions}>
                {!alert.read && (
                  <button
                    type="button"
                    className={styles.markReadBtn}
                    onClick={() => markOneReadMutation.mutate(alert.id)}
                    title="Mark as read"
                  >
                    Mark read
                  </button>
                )}
                <button
                  type="button"
                  className={styles.deleteBtn}
                  onClick={() => deleteAlertMutation.mutate(alert.id)}
                  title="Delete notification"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
