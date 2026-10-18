import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { devicesApi } from '../../api/devices';
import type { DeviceItem, PairingCodeResponse } from '../../api/types';
import styles from './DevicePairingSection.module.css';

export function DevicePairingSection() {
  const queryClient = useQueryClient();
  const [activeCode, setActiveCode] = useState<PairingCodeResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  // Fetch devices
  const { data: devices = [], isLoading } = useQuery<DeviceItem[]>({
    queryKey: ['devices'],
    queryFn: () => devicesApi.getDevices(),
  });

  // Pairing code mutation
  const codeMutation = useMutation({
    mutationFn: () => devicesApi.createPairingCode(),
    onSuccess: (data) => {
      setActiveCode(data);
      const remaining = Math.max(0, Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(remaining);
      setCopied(false);
    },
  });

  // Revoke device mutation
  const revokeMutation = useMutation({
    mutationFn: (id: string) => devicesApi.revokeDevice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });

  // Countdown timer
  useEffect(() => {
    if (!secondsLeft || secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (!prev || prev <= 1) {
          clearInterval(interval);
          setActiveCode(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft]);

  const handleCopy = () => {
    if (!activeCode?.code) return;
    navigator.clipboard.writeText(activeCode.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <section className={styles.container} aria-labelledby="devices-heading">
      <div className={styles.headerRow}>
        <div>
          <h2 id="devices-heading" className={styles.headerTitle}>
            Connected Devices &amp; Extension
          </h2>
          <p className={styles.headerSubtitle}>
            Pair your Chrome Activity Tracker extension to stream browsing telemetry directly into
            your dashboard.
          </p>
        </div>
        <button
          type="button"
          className={styles.generateBtn}
          onClick={() => codeMutation.mutate()}
          disabled={codeMutation.isPending}
        >
          {codeMutation.isPending ? 'Generating...' : '+ Generate Pairing Code'}
        </button>
      </div>

      {codeMutation.isError && (
        <p role="alert" style={{ color: '#dc2626', fontSize: '0.875rem', marginBottom: '1rem' }}>
          Failed to generate pairing code. Please try again.
        </p>
      )}

      {/* Active Code Display */}
      {activeCode && secondsLeft && secondsLeft > 0 ? (
        <div className={styles.codeCard}>
          <div className={styles.codeHeader}>
            <span className={styles.codeLabel}>One-Time Pairing Code:</span>
            <span className={styles.countdownBadge}>
              Expires in {formatCountdown(secondsLeft)}
            </span>
          </div>
          <div className={styles.codeBox}>
            <span className={styles.codeValue}>{activeCode.code}</span>
            <button type="button" className={styles.copyBtn} onClick={handleCopy}>
              {copied ? 'Copied ✓' : 'Copy Code'}
            </button>
          </div>
          <p className={styles.codeInstructions}>
            Open the <strong>Attention Tracker</strong> extension in your Chrome browser, paste this
            code, and click <strong>Connect</strong>.
          </p>
        </div>
      ) : null}

      {/* Devices List */}
      <div className={styles.deviceTableWrapper}>
        <table className={styles.deviceTable}>
          <thead>
            <tr>
              <th>Device Name</th>
              <th>Platform</th>
              <th>Last Synced</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className={styles.emptyDevices}>
                  Loading paired devices...
                </td>
              </tr>
            ) : devices.length === 0 ? (
              <tr>
                <td colSpan={5} className={styles.emptyDevices}>
                  No devices connected yet. Click <strong>Generate Pairing Code</strong> to connect your Chrome extension.
                </td>
              </tr>
            ) : (
              devices.map((device) => {
                const isRevoked = Boolean(device.revokedAt);
                return (
                  <tr key={device.id}>
                    <td>
                      <div className={styles.deviceName}>
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <rect width="20" height="14" x="2" y="3" rx="2" />
                          <line x1="8" x2="16" y1="21" y2="21" />
                          <line x1="12" x2="12" y1="17" y2="21" />
                        </svg>
                        <span>{device.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className={styles.platformPill}>Chrome</span>
                    </td>
                    <td>
                      {device.lastSeenAt
                        ? new Date(device.lastSeenAt).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Never'}
                    </td>
                    <td>
                      {isRevoked ? (
                        <span className={styles.statusRevoked}>Revoked</span>
                      ) : (
                        <span className={styles.statusActive}>● Active</span>
                      )}
                    </td>
                    <td>
                      {!isRevoked ? (
                        <button
                          type="button"
                          className={styles.revokeBtn}
                          onClick={() => {
                            if (window.confirm(`Revoke access for "${device.name}"?`)) {
                              revokeMutation.mutate(device.id);
                            }
                          }}
                          disabled={revokeMutation.isPending}
                        >
                          Revoke
                        </button>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>None</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
