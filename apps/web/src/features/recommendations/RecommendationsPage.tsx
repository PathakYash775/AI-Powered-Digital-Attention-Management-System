import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { recommendationsApi } from '../../api/recommendations';
import type { Recommendation } from '../../api/types';
import styles from './RecommendationsPage.module.css';

function safeText(val: unknown): string {
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object' && val !== null) {
    const obj = val as Record<string, unknown>;
    if (obj.description) return String(obj.description);
    if (obj.title) return String(obj.title);
    if (obj.text) return String(obj.text);
    if (obj.message) return String(obj.message);
    if (obj.reason) return String(obj.reason);
    return JSON.stringify(val);
  }
  return '';
}

// Fallback high-impact actionable suggestions if no telemetry recorded yet
const DEFAULT_SUGGESTIONS = [
  'Your recorded focus sessions are short on average. Try a manageable 3-5 minute focus session, then gradually increase its duration as comfortable.',
  'No explicit distractions or application switches were recorded. Continue tracking your sessions to identify useful patterns.',
  'Review your active task deadlines and prioritize the single highest impact milestone for your next deep work block.',
  'Your habit consistency stabilizes focus over time. Try choosing one small daily habit and completing it consistently.',
];

export function RecommendationsPage() {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const data = await recommendationsApi.listRecommendations();
      setRecommendations(data);
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRecommendations();
  }, []);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      await recommendationsApi.generateRecommendations();
      await fetchRecommendations();
    } catch {
      // Graceful fallback
    } finally {
      setGenerating(false);
    }
  };

  const handleExecuteAction = (rec: Recommendation) => {
    if (rec.actionType === 'start_focus_session') {
      const plannedMin = rec.actionPayload?.plannedMin || 25;
      navigate(`/focus?plannedMin=${plannedMin}`);
    } else if (rec.actionType === 'set_goal') {
      navigate('/goals');
    } else if (rec.actionType === 'take_break') {
      navigate('/focus');
    } else {
      navigate('/activity');
    }
  };

  // Build the 4 display items
  const displayItems = recommendations.length > 0
    ? recommendations.slice(0, 4).map((r, i) => {
        const text = safeText(r.description) || safeText(r.reason) || safeText(r.title);
        return {
          id: r.id,
          text: text || DEFAULT_SUGGESTIONS[i % DEFAULT_SUGGESTIONS.length],
          rec: r,
        };
      })
    : DEFAULT_SUGGESTIONS.map((text, i) => ({
        id: `default-${i}`,
        text,
        rec: null as Recommendation | null,
      }));

  return (
    <div className={styles.container}>
      {/* Clean Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Digital Attention Manager</h1>
          <p className={styles.subtitle}>Build better focus habits with personalized recommendations</p>
        </div>
        <button
          type="button"
          className={styles.refreshBtn}
          onClick={() => void handleGenerate()}
          disabled={generating}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          </svg>
          {generating ? 'Analyzing Telemetry...' : 'Refresh Suggestions'}
        </button>
      </div>

      {/* Section 1: Your suggestions */}
      <section className={styles.suggestionsCard} aria-label="Your suggestions">
        <h2 className={styles.sectionHeading}>Your suggestions</h2>

        {loading ? (
          <div className={styles.loadingState}>Analyzing attention telemetry...</div>
        ) : (
          <div className={styles.suggestionsList}>
            {displayItems.map((item, idx) => (
              <div key={item.id} className={styles.suggestionItem}>
                <div className={styles.numberBadge}>{idx + 1}.</div>
                <div className={styles.suggestionText}>
                  {item.text}
                </div>
                {item.rec?.actionType ? (
                  <button
                    type="button"
                    className={styles.itemActionBtn}
                    onClick={() => handleExecuteAction(item.rec!)}
                  >
                    Action →
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section 2: Take action */}
      <section className={styles.actionsCard} aria-label="Take action">
        <h2 className={styles.sectionHeading}>Take action</h2>
        <p className={styles.actionsSubtext}>Plan a focus session and review your recorded activity.</p>

        <div className={styles.actionGrid}>
          <button
            type="button"
            className={styles.actionTile}
            onClick={() => navigate('/focus')}
          >
            <div className={styles.tileIcon}>⚡</div>
            <div className={styles.tileContent}>
              <div className={styles.tileTitle}>Start Focus Session</div>
              <div className={styles.tileDesc}>Launch an uninterrupted 25-minute Pomodoro timer</div>
            </div>
          </button>

          <button
            type="button"
            className={styles.actionTile}
            onClick={() => navigate('/goals')}
          >
            <div className={styles.tileIcon}>🎯</div>
            <div className={styles.tileContent}>
              <div className={styles.tileTitle}>Set Focus Goal</div>
              <div className={styles.tileDesc}>Define daily deep work and habit targets</div>
            </div>
          </button>

          <button
            type="button"
            className={styles.actionTile}
            onClick={() => navigate('/tasks')}
          >
            <div className={styles.tileIcon}>📋</div>
            <div className={styles.tileContent}>
              <div className={styles.tileTitle}>Manage Tasks</div>
              <div className={styles.tileDesc}>Prioritize upcoming assignments and deadlines</div>
            </div>
          </button>

          <button
            type="button"
            className={styles.actionTile}
            onClick={() => navigate('/activity')}
          >
            <div className={styles.tileIcon}>📊</div>
            <div className={styles.tileContent}>
              <div className={styles.tileTitle}>Review Activity</div>
              <div className={styles.tileDesc}>Inspect application usage and context switches</div>
            </div>
          </button>
        </div>
      </section>
    </div>
  );
}
