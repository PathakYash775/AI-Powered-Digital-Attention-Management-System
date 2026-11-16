import { useState, useEffect } from 'react';
import { aiApi } from '../../api/ai';
import type { DailyBriefing } from '../../api/types';
import styles from './DailyBriefingCard.module.css';

interface DailyBriefingCardProps {
  date?: string;
}

function safeItemText(item: unknown): string {
  if (typeof item === 'string') return item;
  if (typeof item === 'number') return String(item);
  if (typeof item === 'object' && item !== null) {
    const obj = item as Record<string, unknown>;
    return String(obj.text || obj.title || obj.headline || obj.description || obj.message || JSON.stringify(item));
  }
  return '';
}

export function DailyBriefingCard({ date }: DailyBriefingCardProps) {
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBriefing = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await aiApi.getDailyBriefing(date);
      setBriefing(data);
    } catch {
      setError('Unable to load AI Daily Briefing');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchBriefing();
  }, [date]);

  if (loading) {
    return (
      <div className={styles.briefingCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', border: '3px solid #3b82f6', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Synthesizing attention records with Gemini AI...</span>
        </div>
      </div>
    );
  }

  if (error || !briefing) {
    return null;
  }

  const highlights = briefing.highlights || [];
  const risks = briefing.productivityRisks || briefing.risks || [];
  const blocks = briefing.suggestedImprovements || briefing.suggestedFocusBlocks || [];

  return (
    <div className={styles.briefingCard}>
      <div className={styles.cardHeader}>
        <div className={styles.headerLeft}>
          <span className={styles.aiBadge}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07l14.14-14.14" />
            </svg>
            {briefing.provider === 'gemini' ? 'Gemini 3.8 Flash' : 'AI Attention Synthesis'}
          </span>
          <h3 className={styles.title}>{briefing.headline}</h3>
        </div>
        <button className={styles.refreshBtn} onClick={() => void fetchBriefing()} title="Refresh Daily Analysis">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
          </svg>
          Re-Analyze
        </button>
      </div>

      <p className={styles.narrative}>{briefing.briefing || briefing.summary}</p>

      <div className={styles.sectionsGrid}>
        {highlights.length > 0 && (
          <div className={styles.sectionBox}>
            <h4 className={`${styles.sectionTitle} ${styles.highlightsTitle}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              What Went Well Today
            </h4>
            <ul className={styles.list}>
              {highlights.map((item, idx) => (
                <li key={idx} className={styles.listItem}>
                  <span className={`${styles.bullet} ${styles.greenBullet}`} />
                  <span>{safeItemText(item)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {risks.length > 0 && (
          <div className={styles.sectionBox}>
            <h4 className={`${styles.sectionTitle} ${styles.risksTitle}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" />
              </svg>
              Productivity Friction Points
            </h4>
            <ul className={styles.list}>
              {risks.map((item, idx) => (
                <li key={idx} className={styles.listItem}>
                  <span className={`${styles.bullet} ${styles.amberBullet}`} />
                  <span>{safeItemText(item)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {blocks.length > 0 && (
          <div className={styles.sectionBox}>
            <h4 className={`${styles.sectionTitle} ${styles.focusBlocksTitle}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Suggested Focus Optimization
            </h4>
            <ul className={styles.list}>
              {blocks.map((item, idx) => (
                <li key={idx} className={styles.listItem}>
                  <span className={`${styles.bullet} ${styles.purpleBullet}`} />
                  <span>{safeItemText(item)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

