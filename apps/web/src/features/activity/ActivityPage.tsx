import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  useActivityNotifications,
  useActivityReport,
  useActivitySessions,
  useTaskSwitches,
} from './hooks';
import { devicesApi } from '../../api/devices';
import { formatDateTime, formatDuration, getTodayDateString } from '../../lib/format';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import styles from './ActivityPage.module.css';

type DetailTab = 'sessions' | 'switches' | 'notifications';
type ViewMode = 'summary' | 'timeline' | 'table';

export function ActivityPage() {
  const today = getTodayDateString();
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [activeTab, setActiveTab] = useState<DetailTab>('sessions');
  const [viewMode, setViewMode] = useState<ViewMode>('summary');

  // Fetch telemetry report for selected date
  const { data: report, refetch: refetchReport } = useActivityReport(selectedDate);

  // Fetch registered devices
  const { data: devices = [], refetch: refetchDevices } = useQuery({
    queryKey: ['devices'],
    queryFn: () => devicesApi.getDevices(),
  });

  // Fetch paginated sessions, switches, and notifications
  const filter = {
    from: selectedDate,
    to: selectedDate,
  };

  const sessionsQuery = useActivitySessions(filter);
  const switchesQuery = useTaskSwitches(filter);
  const notificationsQuery = useActivityNotifications(filter);

  const allSessions = sessionsQuery.data?.pages.flatMap((p) => p.items) ?? [];
  const allSwitches = switchesQuery.data?.pages.flatMap((p) => p.items) ?? [];
  const allNotifs = notificationsQuery.data?.pages.flatMap((p) => p.items) ?? [];

  const handleRefresh = async () => {
    await Promise.all([
      refetchReport(),
      refetchDevices(),
      sessionsQuery.refetch(),
      switchesQuery.refetch(),
      notificationsQuery.refetch(),
    ]);
  };

  // Derive metric values
  const summary = report?.summary;
  const totalScreenSec = summary?.totalScreenSec ?? 0;
  const activeSec = summary?.activeSec ?? 0;
  const idleSec = summary?.idleSec ?? 0;
  const switchCount = summary?.switchCount ?? allSwitches.length;
  const hourlyPatterns = report?.hourlyPatterns ?? [];

  // Format screen time string
  const formatScreenTimeHoursMins = (sec: number) => {
    if (sec <= 0) return '0m';
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    if (hrs === 0) return `${mins}m`;
    if (mins === 0) return `${hrs}h`;
    return `${hrs}h ${mins}m`;
  };

  const totalTimeDisplay = formatScreenTimeHoursMins(totalScreenSec);
  const activeDisplay = formatScreenTimeHoursMins(activeSec);
  const idleDisplay = formatScreenTimeHoursMins(idleSec);

  // Transitions per hour average
  const hoursActive = Math.max(1, Math.round(activeSec / 3600));
  const avgTransitionsPerHour = Math.round(switchCount / hoursActive);

  // Primary paired device
  const primaryDevice = devices[0];
  const deviceName = primaryDevice?.name || 'Windows Workstation';
  const hasConnectedDevice = devices.length > 0;

  // Active applications
  const uniqueAppsCount = summary?.topSites?.length ?? allSessions.length;
  const topApp = summary?.topSites?.[0]?.name ?? (allSessions[0]?.domain || 'N/A');

  // Check if hourly patterns have actual recorded telemetry
  const hasHourlyData = hourlyPatterns.some((h) => h.activeSec > 0 || h.idleSec > 0);
  const maxHourlySec = Math.max(
    ...hourlyPatterns.map((h) => h.activeSec + h.idleSec),
    3600,
  );

  return (
    <div className={styles.container}>
      {/* Page Header matching screenshot */}
      <header className={styles.pageHeader}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>Activity Tracking &amp; Monitoring</h1>
          <p className={styles.subtitle}>
            Operating-system &amp; browser activity telemetry gathered with user consent via the Digital Attention Agent.
          </p>
        </div>

        {/* Action Controls Bar */}
        <div className={styles.controlsBar}>
          <div className={styles.statusPill}>
            <span className={styles.pulseDot} />
            <span>Status: ACTIVE</span>
          </div>

          <div className={styles.viewToggleGroup} role="group" aria-label="View toggle">
            <button
              type="button"
              className={`${styles.viewToggleBtn} ${viewMode === 'summary' ? styles.activeView : ''}`}
              onClick={() => setViewMode('summary')}
              title="Summary Cards"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
              </svg>
            </button>
            <button
              type="button"
              className={`${styles.viewToggleBtn} ${viewMode === 'timeline' ? styles.activeView : ''}`}
              onClick={() => setViewMode('timeline')}
              title="Timeline"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </button>
            <button
              type="button"
              className={`${styles.viewToggleBtn} ${viewMode === 'table' ? styles.activeView : ''}`}
              onClick={() => setViewMode('table')}
              title="Data Table"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>

          <div className={styles.datePickerPill}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <input
              type="date"
              className={styles.dateInput}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              aria-label="Select date"
            />
          </div>

          <button type="button" className={styles.refreshBtn} onClick={handleRefresh}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* Privacy Safeguard Active Card */}
      <section className={styles.privacyCard} aria-label="Privacy Safeguard Notice">
        <svg
          className={styles.shieldIcon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
        <p className={styles.privacyText}>
          <span className={styles.privacyHighlight}>Privacy Safeguard Active:</span> Digital Attention only logs top-level application names and window titles. Keystrokes, clipboard buffers, passwords, and private contents are never recorded or transmitted.
        </p>
      </section>

      {/* 4 Metric Summary Cards in a row */}
      <section className={styles.metricsGrid} aria-label="Activity Metrics">
        {/* TOTAL SCREEN TIME */}
        <div className={styles.metricCard}>
          <div className={styles.metricCardHeader}>
            <span className={styles.metricLabel}>Total Screen Time</span>
            <svg className={styles.metricIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className={styles.metricValue}>{totalTimeDisplay}</div>
          <div className={styles.metricSubtext}>
            Active: {activeDisplay} | Idle: {idleDisplay}
          </div>
        </div>

        {/* TASK SWITCHES */}
        <div className={styles.metricCard}>
          <div className={styles.metricCardHeader}>
            <span className={styles.metricLabel}>Task Switches</span>
            <svg className={styles.metricIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="16 3 21 3 21 8" />
              <line x1="4" y1="20" x2="21" y2="3" />
              <polyline points="21 16 21 21 16 21" />
              <line x1="15" y1="15" x2="21" y2="21" />
              <line x1="4" y1="4" x2="9" y2="9" />
            </svg>
          </div>
          <div className={styles.metricValue}>{switchCount}</div>
          <div className={styles.metricSubtext}>
            Avg ~{avgTransitionsPerHour} context transitions / hour
          </div>
        </div>

        {/* REGISTERED DEVICE */}
        <div className={styles.metricCard}>
          <div className={styles.metricCardHeader}>
            <span className={styles.metricLabel}>Registered Device</span>
            <svg className={styles.metricIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          <div className={styles.metricValue} style={{ fontSize: '1.25rem', marginTop: '0.2rem' }}>
            {deviceName}
          </div>
          <div className={styles.metricSubtext}>
            {hasConnectedDevice ? (
              <span className={styles.metricDeviceConnected}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                Desktop Agent Connected (60s sync)
              </span>
            ) : (
              <span>No device paired yet</span>
            )}
          </div>
        </div>

        {/* ACTIVE APPLICATIONS */}
        <div className={styles.metricCard}>
          <div className={styles.metricCardHeader}>
            <span className={styles.metricLabel}>Active Applications</span>
            <svg className={styles.metricIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
          </div>
          <div className={styles.metricValue}>{uniqueAppsCount}</div>
          <div className={styles.metricSubtext}>
            Top: {topApp}
          </div>
        </div>
      </section>

      {/* Hourly Activity & Focus Distribution Card */}
      <section className={styles.distributionCard} aria-label="Hourly Activity and Focus Distribution">
        <div className={styles.distributionHeader}>
          <h2 className={styles.distributionTitle}>Hourly Activity &amp; Focus Distribution</h2>
          {hasHourlyData && (
            <div className={styles.distributionLegend}>
              <span>
                <span className={`${styles.legendDot} ${styles.legendActive}`} /> Active Focus
              </span>
              <span>
                <span className={`${styles.legendDot} ${styles.legendIdle}`} /> Idle Time
              </span>
            </div>
          )}
        </div>

        {!hasHourlyData ? (
          /* Exact empty state from user screenshot */
          <div className={styles.emptyStateContainer}>
            <div className={styles.emptyStateCircle}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <h3 className={styles.emptyStateTitle}>No Hourly Activity Recorded Yet</h3>
            <p className={styles.emptyStateSubtitle}>
              Foreground application intervals will appear here once the desktop agent records active computer sessions for this day.
            </p>
          </div>
        ) : (
          /* 24-hour distribution bar chart */
          <div className={styles.hourlyChartContainer}>
            <div className={styles.hourlyBars}>
              {hourlyPatterns.map((item) => {
                const totalHourSec = item.activeSec + item.idleSec;
                const totalPct = Math.min(100, Math.round((totalHourSec / maxHourlySec) * 100));
                const activePct = totalHourSec > 0 ? (item.activeSec / totalHourSec) * 100 : 0;
                const idlePct = 100 - activePct;

                return (
                  <div key={item.hour} className={styles.barCol} title={`Hour ${item.hour}:00 - Active: ${formatDuration(item.activeSec)}, Idle: ${formatDuration(item.idleSec)}`}>
                    <div className={styles.barStack} style={{ height: `${Math.max(6, totalPct)}%` }}>
                      <div className={styles.barActive} style={{ height: `${activePct}%` }} />
                      <div className={styles.barIdle} style={{ height: `${idlePct}%` }} />
                    </div>
                    <span className={styles.barHourLabel}>
                      {String(item.hour).padStart(2, '0')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Telemetry Detail Feed & Logs */}
      <section className={styles.detailsCard} aria-label="Telemetry Activity Details">
        <nav className={styles.tabNav} aria-label="Activity Categories">
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'sessions' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('sessions')}
          >
            <span>Application Sessions</span>
            <span className={styles.tabCountBadge}>{allSessions.length}</span>
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'switches' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('switches')}
          >
            <span>Task Switches</span>
            <span className={styles.tabCountBadge}>{allSwitches.length}</span>
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'notifications' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            <span>Unread Badges</span>
            <span className={styles.tabCountBadge}>{allNotifs.length}</span>
          </button>
        </nav>

        {activeTab === 'sessions' && (
          <div className={styles.tableContainer}>
            {sessionsQuery.isLoading ? (
              <div style={{ padding: '2rem' }}>
                <Spinner label="Loading application sessions..." />
              </div>
            ) : allSessions.length === 0 ? (
              <div className={styles.emptyStateContainer} style={{ padding: '2.5rem' }}>
                <p className={styles.emptyStateSubtitle}>
                  No application session intervals recorded for this date.
                </p>
              </div>
            ) : (
              <>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Application / Domain</th>
                      <th>Category</th>
                      <th>Started At</th>
                      <th>Duration</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allSessions.map((s) => (
                      <tr key={s.id}>
                        <td className={styles.domainCell}>{s.domain}</td>
                        <td>
                          <span className={`${styles.categoryTag} ${styles[s.category] || styles.other}`}>
                            {s.category}
                          </span>
                        </td>
                        <td>{formatDateTime(s.startedAt)}</td>
                        <td>{formatDuration(s.durationSec)}</td>
                        <td>
                          {s.idle ? (
                            <span className={styles.idleStatus}>● Idle</span>
                          ) : (
                            <span className={styles.activeStatus}>● Active</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {sessionsQuery.hasNextPage && (
                  <div className={styles.loadMoreBox}>
                    <Button
                      variant="secondary"
                      disabled={sessionsQuery.isFetchingNextPage}
                      onClick={() => sessionsQuery.fetchNextPage()}
                    >
                      {sessionsQuery.isFetchingNextPage ? 'Loading more...' : 'Load more sessions'}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'switches' && (
          <div className={styles.tableContainer}>
            {switchesQuery.isLoading ? (
              <div style={{ padding: '2rem' }}>
                <Spinner label="Loading context switches..." />
              </div>
            ) : allSwitches.length === 0 ? (
              <div className={styles.emptyStateContainer} style={{ padding: '2.5rem' }}>
                <p className={styles.emptyStateSubtitle}>
                  No context switches recorded for this date.
                </p>
              </div>
            ) : (
              <>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>From Application</th>
                      <th>To Application</th>
                      <th>Transition Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allSwitches.map((sw) => (
                      <tr key={sw.id}>
                        <td className={styles.domainCell}>{sw.fromApp}</td>
                        <td className={styles.domainCell}>{sw.toApp}</td>
                        <td>{formatDateTime(sw.switchedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {switchesQuery.hasNextPage && (
                  <div className={styles.loadMoreBox}>
                    <Button
                      variant="secondary"
                      disabled={switchesQuery.isFetchingNextPage}
                      onClick={() => switchesQuery.fetchNextPage()}
                    >
                      {switchesQuery.isFetchingNextPage ? 'Loading more...' : 'Load more switches'}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className={styles.tableContainer}>
            {notificationsQuery.isLoading ? (
              <div style={{ padding: '2rem' }}>
                <Spinner label="Loading badge notifications..." />
              </div>
            ) : allNotifs.length === 0 ? (
              <div className={styles.emptyStateContainer} style={{ padding: '2.5rem' }}>
                <p className={styles.emptyStateSubtitle}>
                  No notification badge increments recorded for this date.
                </p>
              </div>
            ) : (
              <>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Source Application / Domain</th>
                      <th>Notification Detected At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allNotifs.map((n) => (
                      <tr key={n.id}>
                        <td className={styles.domainCell}>{n.sourceApp}</td>
                        <td>{formatDateTime(n.receivedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {notificationsQuery.hasNextPage && (
                  <div className={styles.loadMoreBox}>
                    <Button
                      variant="secondary"
                      disabled={notificationsQuery.isFetchingNextPage}
                      onClick={() => notificationsQuery.fetchNextPage()}
                    >
                      {notificationsQuery.isFetchingNextPage ? 'Loading more...' : 'Load more alerts'}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
