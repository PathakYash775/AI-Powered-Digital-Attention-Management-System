import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { devicesApi } from '../../api/devices';
import type { ExtensionStatusResponse, PairingCodeResponse, DeviceItem } from '../../api/types';
import styles from './DevicePairingSection.module.css';

export function DevicePairingSection() {
  const queryClient = useQueryClient();
  const [connectMessage, setConnectMessage] = useState<string | null>(null);
  const [activeCode, setActiveCode] = useState<PairingCodeResponse | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  const {
    data: status,
    isLoading: isStatusLoading,
    refetch: refetchStatus,
    isFetching,
  } = useQuery<ExtensionStatusResponse>({
    queryKey: ['extension-status'],
    queryFn: () => devicesApi.getExtensionStatus(),
    refetchInterval: 5000,
  });

  const { data: devicesList, refetch: refetchDevices } = useQuery<DeviceItem[]>({
    queryKey: ['devices'],
    queryFn: () => devicesApi.getDevices(),
    refetchInterval: 5000,
  });

  const autoLinkMutation = useMutation({
    mutationFn: () => devicesApi.autoLink(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extension-status'] });
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      setConnectMessage('✓ Digital Attention Tracker connected successfully!');
      setTimeout(() => setConnectMessage(null), 5000);
      refetchStatus();
    },
    onError: () => {
      setConnectMessage('Failed to connect. Please make sure the backend is running.');
      setTimeout(() => setConnectMessage(null), 5000);
    },
  });

  const codeMutation = useMutation({
    mutationFn: () => devicesApi.createPairingCode(),
    onSuccess: (data) => {
      setActiveCode(data);
      const remaining = Math.max(
        0,
        Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000),
      );
      setSecondsLeft(remaining > 0 ? remaining : 600);
      setCopied(false);
    },
    onError: () => {
      setConnectMessage('Failed to generate pairing code. Please make sure you are logged in.');
      setTimeout(() => setConnectMessage(null), 5000);
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: (id: string) => devicesApi.revokeDevice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extension-status'] });
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      setConnectMessage('✓ Device disconnected and revoked successfully.');
      setTimeout(() => setConnectMessage(null), 5000);
      refetchStatus();
    },
    onError: () => {
      setConnectMessage('Failed to disconnect device.');
      setTimeout(() => setConnectMessage(null), 5000);
    },
  });

  useEffect(() => {
    if (!secondsLeft || secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (!prev || prev <= 1) {
          clearInterval(timer);
          setActiveCode(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const handleCopy = () => {
    if (!activeCode) return;
    navigator.clipboard.writeText(activeCode.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatLastActive = (dateStr?: string | null) => {
    if (!dateStr) return 'No recent activity';
    const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diffSec < 15) return 'Active just now';
    if (diffSec < 60) return `Active ${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `Active ${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Active ${diffHours}h ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  const isConnected = Boolean(status?.connected);
  const activeDeviceId = status?.activeDevice?.id;

  const list = Array.isArray(devicesList) ? devicesList : [];
  const windowsDevice = list.find((d) => d.platform === 'windows' && !d.revokedAt);
  const isWindowsConnected = Boolean(
    windowsDevice?.lastSeenAt &&
    Date.now() - new Date(windowsDevice.lastSeenAt).getTime() <= 3 * 60 * 1000,
  );

  const androidDevice = list.find((d) => d.platform === 'android' && !d.revokedAt);
  const isAndroidConnected = Boolean(
    androidDevice?.lastSeenAt &&
    Date.now() - new Date(androidDevice.lastSeenAt).getTime() <= 15 * 60 * 1000,
  );

  return (
    <section className={styles.sectionContainer} aria-labelledby="activity-monitoring-heading">
      <div className={styles.headerRow}>
        <div className={styles.titleGroup}>
          <div className={styles.headerIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <div>
            <span className={styles.badgeLabel}>Chrome Extension</span>
            <h2 id="activity-monitoring-heading" className={styles.sectionTitle}>
              Activity monitoring
            </h2>
          </div>
        </div>

        <div className={styles.actionsGroup}>
          {isStatusLoading ? (
            <span className={styles.checkingBadge}>Checking...</span>
          ) : isConnected ? (
            <div className={styles.connectedBadge} data-testid="extension-connected-badge">
              <span className={styles.greenDot} />
              <span>Connected</span>
            </div>
          ) : (
            <div className={styles.disconnectedBadge} data-testid="extension-disconnected-badge">
              <span className={styles.grayDot} />
              <span>Not Connected</span>
            </div>
          )}

          <button
            type="button"
            className={styles.generateButton}
            onClick={() => codeMutation.mutate()}
            disabled={codeMutation.isPending}
            title="Generate pairing code for Windows Desktop App or Chrome Extension"
          >
            {codeMutation.isPending ? 'Generating...' : '🔑 Pair Extension / Tracker'}
          </button>

          <button
            type="button"
            className={styles.connectButton}
            onClick={() => autoLinkMutation.mutate()}
            disabled={autoLinkMutation.isPending}
            title="Link and connect Digital Attention Tracker extension"
          >
            {autoLinkMutation.isPending ? 'Connecting...' : isConnected ? '✓ Re-sync Connection' : '⚡ Connect Extension'}
          </button>

          <button
            type="button"
            className={styles.refreshButton}
            onClick={() => {
              refetchStatus();
              refetchDevices();
            }}
            disabled={isFetching}
            title="Refresh connection status"
          >
            {isFetching ? 'Refreshing...' : '🔄 Refresh'}
          </button>

          {activeDeviceId && isConnected && (
            <button
              type="button"
              className={styles.disconnectButton}
              onClick={() => disconnectMutation.mutate(activeDeviceId)}
              disabled={disconnectMutation.isPending}
              title="Disconnect and revoke Chrome Extension"
            >
              {disconnectMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
            </button>
          )}
        </div>
      </div>

      {connectMessage && (
        <div className={styles.toastNotice} role="status">
          {connectMessage}
        </div>
      )}

      {/* Real-time Device Telemetry Statistics - Chrome */}
      <div className={styles.deviceStatsBox}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Device</span>
          <span className={styles.statValue}>Chrome Extension</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Connection Status</span>
          <span className={styles.statValue} style={{ color: isConnected ? '#16a34a' : '#64748b' }}>
            {isConnected ? '🟢 Connected (Active)' : '⚪ Disconnected / Idle'}
          </span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Last Active</span>
          <span className={styles.statValue}>{formatLastActive(status?.activeDevice?.lastSeenAt)}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Data Synchronization</span>
          <span className={styles.statValue}>
            {status?.todayStats?.activityCount ?? 0} events synced today
            {status?.todayStats?.lastDomain ? ` (latest: ${status.todayStats.lastDomain})` : ''}
          </span>
        </div>
      </div>

      {/* Real-time Device Telemetry Statistics - Windows Tracker */}
      <div className={styles.deviceStatsBox} style={{ marginTop: '0.75rem' }}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Device</span>
          <span className={styles.statValue}>Windows Desktop Tracker</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Connection Status</span>
          <span className={styles.statValue} style={{ color: isWindowsConnected ? '#16a34a' : '#64748b' }}>
            {isWindowsConnected ? '🟢 Connected (Active)' : '⚪ Disconnected / Idle'}
          </span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Last Active</span>
          <span className={styles.statValue}>{formatLastActive(windowsDevice?.lastSeenAt)}</span>
        </div>
        <div className={styles.statItem}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span className={styles.statLabel}>Data Synchronization</span>
              <span className={styles.statValue}>
                {isWindowsConnected
                  ? 'Active background session tracking'
                  : windowsDevice
                  ? 'Offline / Idle'
                  : 'Not paired'}
              </span>
            </div>
            {windowsDevice && (
              <button
                type="button"
                className={styles.disconnectButton}
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', marginLeft: '0.5rem' }}
                onClick={() => disconnectMutation.mutate(windowsDevice.id)}
                disabled={disconnectMutation.isPending}
                aria-label="Disconnect Windows Tracker"
                title="Disconnect Windows Tracker"
              >
                {disconnectMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Real-time Device Telemetry Statistics - Android Mobile Tracker */}
      <div className={styles.deviceStatsBox} style={{ marginTop: '0.75rem' }}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Device</span>
          <span className={styles.statValue}>Android Mobile Tracker</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Connection Status</span>
          <span className={styles.statValue} style={{ color: isAndroidConnected ? '#16a34a' : '#64748b' }}>
            {isAndroidConnected ? '🟢 Connected (Active)' : '⚪ Disconnected / Idle'}
          </span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Last Active</span>
          <span className={styles.statValue}>{formatLastActive(androidDevice?.lastSeenAt)}</span>
        </div>
        <div className={styles.statItem}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div>
              <span className={styles.statLabel}>Data Synchronization</span>
              <span className={styles.statValue}>
                {isAndroidConnected
                  ? 'Active background session tracking'
                  : androidDevice
                  ? 'Offline / Idle'
                  : 'Not paired'}
              </span>
            </div>

            {androidDevice && (
              <button
                type="button"
                className={styles.disconnectButton}
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', marginLeft: '0.5rem' }}
                onClick={() => disconnectMutation.mutate(androidDevice.id)}
                disabled={disconnectMutation.isPending}
                aria-label="Disconnect Android Tracker"
                title="Disconnect Android Tracker"
              >
                {disconnectMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
              </button>
            )}
          </div>
        </div>
      </div>

      {activeCode && secondsLeft && secondsLeft > 0 && (
        <div className={styles.codeCard}>
          <div className={styles.codeHeader}>
            <span className={styles.codeLabel}>One-Time Pairing Code for Windows App / Extension:</span>
            <span className={styles.countdownBadge}>
              Expires in {formatCountdown(secondsLeft)}
            </span>
          </div>
          <div className={styles.codeBox}>
            <span className={styles.codeValue}>{activeCode.code}</span>
            <button type="button" className={styles.copyBtn} onClick={handleCopy}>
              {copied ? '✓ Copied' : 'Copy Code'}
            </button>
          </div>
          <p className={styles.codeInstructions}>
            Open the <strong>Chrome Extension popup</strong> or Attention Desktop App, enter this 8-character code, and click <strong>Connect Extension</strong>.
          </p>
        </div>
      )}

      <button
        type="button"
        className={styles.guideToggleBtn}
        onClick={() => setShowInstallGuide((prev) => !prev)}
      >
        {showInstallGuide ? '▾ Hide Extension Installation Guide' : '▸ Extension not installed yet? View Installation Instructions'}
      </button>

      {showInstallGuide && (
        <div className={styles.installGuideCard}>
          <strong>How to install the Chrome Extension:</strong>
          <ol>
            <li>Open Google Chrome and navigate to <code>chrome://extensions/</code>.</li>
            <li>Enable <strong>Developer mode</strong> using the toggle switch in the top-right corner.</li>
            <li>Click <strong>Load unpacked</strong> on the top left.</li>
            <li>Select the <code>extension</code> folder in this project directory.</li>
            <li>Click the extension icon in your toolbar, click "Pair Extension / Tracker" above to generate a code, and paste it into the popup!</li>
          </ol>
        </div>
      )}

      <p className={styles.leadDescription}>
        Capture is controlled from this website: it starts automatically when you sign in and can be paused or resumed any time with the button in the top-right of the Overview and Activity pages. The background agent records the name of the focused application, session start/end times, duration, idle state, and — unless disabled — window titles. It never records keystrokes, clipboard contents, screenshots, or file contents.
      </p>

      <div className={styles.infoCardsGrid}>
        {/* Shield / Privacy Card */}
        <div className={styles.infoCard}>
          <div className={styles.cardIconBox}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div className={styles.cardContent}>
            <p className={styles.cardText}>
              <strong>Real tracking works on Google Chrome, Brave, and Edge</strong> (requires the companion Digital Attention Tracker extension). When foreground can't be identified, nothing is recorded (no fabricated data). Sensitive applications can be excluded or paused at any time.
            </p>
          </div>
        </div>

        {/* Windows Desktop App Card */}
        <div className={styles.infoCard}>
          <div className={styles.cardIconBox}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          <div className={styles.cardContent}>
            <p className={styles.cardText}>
              <strong>Windows Desktop App:</strong> The desktop tracker pairs with your account using an 8-character pairing code or auto-links when launched. Foreground desktop applications are tracked in the background.
            </p>
          </div>
        </div>

        {/* Android Mobile App Card */}
        <div className={styles.infoCard}>
          <div className={styles.cardIconBox}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
              <line x1="12" y1="18" x2="12.01" y2="18" />
            </svg>
          </div>
          <div className={styles.cardContent}>
            <p className={styles.cardText}>
              <strong>Android Mobile App:</strong> Tracks foreground application usage and switches via Android <code>UsageStatsManager</code>. Data is queued locally and securely synced in the background with WorkManager without draining battery.
            </p>
          </div>
        </div>
      </div>

      <div className={styles.footerRow}>
        <a href="/activity" className={styles.viewActivityLink}>
          View recorded activity ➔
        </a>
      </div>
    </section>
  );
}
