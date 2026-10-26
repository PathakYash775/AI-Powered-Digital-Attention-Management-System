import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { devicesApi } from '../../api/devices';
import type { ExtensionStatusResponse, PairingCodeResponse } from '../../api/types';
import styles from './DevicePairingSection.module.css';

export function DevicePairingSection() {
  const queryClient = useQueryClient();
  const [connectMessage, setConnectMessage] = useState<string | null>(null);
  const [activeCode, setActiveCode] = useState<PairingCodeResponse | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

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

  const isConnected = Boolean(status?.connected);

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
            {codeMutation.isPending ? 'Generating...' : '🔑 Pair Windows Tracker'}
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
            onClick={() => refetchStatus()}
            disabled={isFetching}
            title="Refresh connection status"
          >
            {isFetching ? 'Refreshing...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {connectMessage && (
        <div className={styles.toastNotice} role="status">
          {connectMessage}
        </div>
      )}

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
            Open the <strong>Attention Management Windows Desktop App</strong> or Chrome extension, enter this 8-character code when prompted, and click <strong>Pair Desktop App</strong>.
          </p>
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
      </div>

      <div className={styles.footerRow}>
        <a href="/activity" className={styles.viewActivityLink}>
          View recorded activity ➔
        </a>
      </div>
    </section>
  );
}
