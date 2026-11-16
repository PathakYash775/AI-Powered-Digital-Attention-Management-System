import { useEffect, useState } from 'react';
import { adminApi } from '../../api/admin';
import type { AdminAuditLogsResponse } from '../../api/types';
import { Spinner } from '../../components/ui/Spinner';
import styles from './AdminSystemPage.module.css';

export function AdminSystemPage() {
  const [data, setData] = useState<AdminAuditLogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'insights' | 'alerts' | 'recommendations'>('all');
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminApi.getAuditLogs();
      setData(res);
    } catch {
      setError('Failed to load system audit logs and telemetry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  if (loading && !data) {
    return <Spinner label="Loading telemetry audit feed..." size="lg" />;
  }

  const insights = data?.insights || [];
  const alerts = data?.alerts || [];
  const recommendations = data?.recommendations || [];

  // Combine into unified feed sorted by timestamp
  type FeedEvent = {
    id: string;
    kind: 'insight' | 'alert' | 'recommendation';
    title: string;
    content: string;
    userEmail: string;
    createdAt: string;
    extra?: string;
  };

  const unifiedFeed: FeedEvent[] = [
    ...(Array.isArray(insights) ? insights : []).map((i) => ({
      id: `insight-${i.id}`,
      kind: 'insight' as const,
      title: i.title,
      content: i.content,
      userEmail: i.userEmail,
      createdAt: i.createdAt,
      extra: `Type: ${i.type}`,
    })),
    ...(Array.isArray(alerts) ? alerts : []).map((a) => ({
      id: `alert-${a.id}`,
      kind: 'alert' as const,
      title: a.title,
      content: a.message,
      userEmail: a.userEmail,
      createdAt: a.createdAt,
      extra: `Severity: ${a.severity}`,
    })),
    ...(Array.isArray(recommendations) ? recommendations : []).map((r) => ({
      id: `rec-${r.id}`,
      kind: 'recommendation' as const,
      title: r.title,
      content: `Category: ${r.category} | Priority: ${r.priority} | Status: ${r.status}`,
      userEmail: r.userEmail,
      createdAt: r.createdAt,
      extra: `Priority: ${r.priority}`,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filteredFeed = unifiedFeed.filter((item) => {
    if (tab === 'all') return true;
    if (tab === 'insights') return item.kind === 'insight';
    if (tab === 'alerts') return item.kind === 'alert';
    if (tab === 'recommendations') return item.kind === 'recommendation';
    return true;
  });

  const getBadgeStyle = (kind: 'insight' | 'alert' | 'recommendation') => {
    switch (kind) {
      case 'insight':
        return { background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' };
      case 'alert':
        return { background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' };
      case 'recommendation':
        return { background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' };
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.headerSection}>
        <div>
          <h2 className={styles.pageHeading}>System Telemetry &amp; Audit Logs</h2>
          <p className={styles.pageSubheading}>
            Live audit feed of AI inferences, smart alerts, and personalized cognitive recommendations
          </p>
        </div>
        <button type="button" onClick={fetchLogs} className={styles.tabBtn} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
          🔄 Refresh Feed
        </button>
      </div>

      {error ? (
        <div role="alert" style={{ color: '#ef4444', padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '10px' }}>
          {error}
        </div>
      ) : null}

      {/* Tabs */}
      <div className={styles.tabBar} role="tablist" aria-label="Filter audit logs">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'all'}
          className={`${styles.tabBtn} ${tab === 'all' ? styles.tabBtnActive : ''}`}
          onClick={() => setTab('all')}
        >
          All Activity ({unifiedFeed.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'insights'}
          className={`${styles.tabBtn} ${tab === 'insights' ? styles.tabBtnActive : ''}`}
          onClick={() => setTab('insights')}
        >
          🧠 AI Inferences ({insights.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'alerts'}
          className={`${styles.tabBtn} ${tab === 'alerts' ? styles.tabBtnActive : ''}`}
          onClick={() => setTab('alerts')}
        >
          🔔 Smart Alerts ({alerts.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'recommendations'}
          className={`${styles.tabBtn} ${tab === 'recommendations' ? styles.tabBtnActive : ''}`}
          onClick={() => setTab('recommendations')}
        >
          💡 Recommendations ({recommendations.length})
        </button>
      </div>

      {/* Feed List */}
      <div className={styles.feedList}>
        {filteredFeed.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--color-surface)', borderRadius: '14px', border: '1px solid var(--color-border)' }}>
            No audit telemetry records found for this category.
          </div>
        ) : (
          filteredFeed.map((item) => (
            <div key={item.id} className={styles.feedItem}>
              <div className={styles.feedItemHeader}>
                <span
                  className={styles.feedItemTypeBadge}
                  style={getBadgeStyle(item.kind)}
                >
                  {item.kind === 'insight' && '🧠 AI Insight'}
                  {item.kind === 'alert' && '🔔 Smart Alert'}
                  {item.kind === 'recommendation' && '💡 Recommendation'}
                </span>
                <span className={styles.feedItemTime}>
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </div>

              <h4 className={styles.feedItemTitle}>{item.title}</h4>
              <p className={styles.feedItemContent}>{item.content}</p>

              <div className={styles.feedItemUser}>
                <span>👤 Target User: <strong>{item.userEmail}</strong></span>
                {item.extra ? <span>• {item.extra}</span> : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

