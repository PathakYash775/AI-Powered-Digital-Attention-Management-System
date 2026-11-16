import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { recommendationsApi } from '../../api/recommendations';
import type { Recommendation, RecommendationCategory, RecommendationStatus } from '../../api/types';
import { Spinner } from '../../components/ui/Spinner';
import styles from './BehavioralRecommendations.module.css';

function safeText(val: unknown): string {
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object' && val !== null) {
    const obj = val as Record<string, unknown>;
    if (obj.title) return `${String(obj.title)}${obj.priority ? ` (${String(obj.priority)} priority)` : ''}`;
    if (obj.text) return String(obj.text);
    if (obj.label) return String(obj.label);
    if (obj.message) return String(obj.message);
    if (obj.description) return String(obj.description);
    if (obj.reason) return String(obj.reason);
    return JSON.stringify(val);
  }
  return '';
}

export function BehavioralRecommendations() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('active'); // 'active' means pending + accepted

  // 1. Fetch Behavioral Analysis (Gemini + Behavioral Engine)
  const {
    data: analysisData,
    isLoading: isAnalysisLoading,
    refetch: refetchAnalysis,
  } = useQuery({
    queryKey: ['recommendations', 'analysis'],
    queryFn: () => recommendationsApi.getBehavioralAnalysis(),
    staleTime: 60_000,
  });

  // 2. Fetch Stored Recommendations
  const {
    data: recommendationsList,
    isLoading: isListLoading,
  } = useQuery({
    queryKey: ['recommendations', 'list'],
    queryFn: () => recommendationsApi.listRecommendations(),
    staleTime: 15_000,
  });

  // 3. Mutation: Regenerate
  const generateMutation = useMutation({
    mutationFn: () => recommendationsApi.generateRecommendations(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      refetchAnalysis();
    },
  });

  // 4. Mutation: Update Status
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: RecommendationStatus }) =>
      recommendationsApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendations', 'list'] });
    },
  });

  const allRecommendations: Recommendation[] = Array.isArray(recommendationsList)
    ? recommendationsList
    : [];

  const filteredRecommendations = allRecommendations.filter((rec) => {
    if (selectedCategory !== 'all' && rec.category !== selectedCategory) {
      return false;
    }
    if (selectedStatus === 'active') {
      return rec.status === 'pending' || rec.status === 'accepted';
    }
    if (selectedStatus !== 'all') {
      return rec.status === selectedStatus;
    }
    return true;
  });

  const getCategoryClass = (category: RecommendationCategory) => {
    switch (category) {
      case 'focus_improvement':
        return styles.catFocus;
      case 'productivity_tip':
        return styles.catProductivity;
      case 'attention_recovery':
        return styles.catRecovery;
      case 'pattern_optimization':
        return styles.catPattern;
      default:
        return '';
    }
  };

  const formatCategoryName = (category: RecommendationCategory) => {
    switch (category) {
      case 'focus_improvement':
        return 'Focus Improvement';
      case 'productivity_tip':
        return 'Productivity Tip';
      case 'attention_recovery':
        return 'Attention Recovery';
      case 'pattern_optimization':
        return 'Pattern Optimization';
      default:
        return category;
    }
  };

  return (
    <div className={styles.container}>
      {/* 1. AI Behavioral Analysis Header Card */}
      <div className={styles.aiHeaderCard}>
        <div className={styles.headerRow}>
          <div className={styles.headerInfo}>
            <div className={styles.aiIconBadge} aria-hidden="true">
              ✨
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h3 className={styles.aiTitle}>AI Behavioral Attention Analysis</h3>
                <span className={styles.providerBadge}>
                  {analysisData?.provider === 'gemini' || (analysisData as any)?.generatedBy?.includes('gemini') ? '⚡ Google Gemini 1.5' : '🧠 Behavioral AI Engine'}
                </span>
              </div>
              <p className={styles.aiSubtitle}>
                Continuous cognitive diagnosis grounded in real context switches, session duration, and distraction telemetry.
              </p>
            </div>
          </div>

          <button
            type="button"
            className={styles.regenBtn}
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            title="Generate fresh behavioral diagnosis and recommendations"
          >
            {generateMutation.isPending ? (
              <>
                <Spinner size="sm" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
                <span>Refresh Recommendations</span>
              </>
            )}
          </button>
        </div>

        {/* Diagnosis & Telemetry Synthesis */}
        {isAnalysisLoading ? (
          <div style={{ padding: '2rem 0', textAlign: 'center' }}>
            <Spinner label="Synthesizing behavioral patterns..." size="md" />
          </div>
        ) : (
          <div className={styles.diagnosisGrid}>
            <div className={styles.diagBox}>
              <span className={styles.diagLabel}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
                Behavioral Diagnosis
              </span>
              <span className={styles.diagValue}>
                {analysisData?.behavioralDiagnosis || 'Stable attention telemetry with balanced task execution.'}
              </span>
            </div>

            <div className={styles.diagBox}>
              <span className={styles.diagLabel}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Peak Cognitive Window
              </span>
              <span className={styles.diagValue} style={{ color: 'var(--color-primary, #7047eb)', fontWeight: 600 }}>
                {typeof analysisData?.peakFocusWindow === 'object' && analysisData?.peakFocusWindow !== null
                  ? (analysisData.peakFocusWindow as any).label ||
                    `${(analysisData.peakFocusWindow as any).startHour}:00 - ${(analysisData.peakFocusWindow as any).endHour}:00`
                  : typeof analysisData?.peakFocusWindow === 'string'
                  ? analysisData.peakFocusWindow
                  : '09:00 - 11:30 (Morning Deep Flow)'}
              </span>
            </div>

            <div className={styles.diagBox}>
              <span className={styles.diagLabel}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {((analysisData as any)?.focusScore ?? 100) >= 75 ? 'Focus Protection Status' : 'Distraction Root Cause'}
              </span>
              <span className={styles.diagValue}>
                {analysisData?.distractionRootCause || (analysisData as any)?.rootCause || 'Rapid communication notifications and tab switching.'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Personalized Actionable Recommendations Grid */}
      <div className={styles.recommendationsList}>
        <div className={styles.recFilterRow}>
          <div className={styles.filterGroup}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #64748b)' }}>
              Category:
            </span>
            <button
              type="button"
              className={`${styles.filterBtn} ${selectedCategory === 'all' ? styles.activeFilter : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              All Types
            </button>
            <button
              type="button"
              className={`${styles.filterBtn} ${selectedCategory === 'focus_improvement' ? styles.activeFilter : ''}`}
              onClick={() => setSelectedCategory('focus_improvement')}
            >
              Focus Improvement
            </button>
            <button
              type="button"
              className={`${styles.filterBtn} ${selectedCategory === 'productivity_tip' ? styles.activeFilter : ''}`}
              onClick={() => setSelectedCategory('productivity_tip')}
            >
              Productivity Tips
            </button>
            <button
              type="button"
              className={`${styles.filterBtn} ${selectedCategory === 'attention_recovery' ? styles.activeFilter : ''}`}
              onClick={() => setSelectedCategory('attention_recovery')}
            >
              Attention Recovery
            </button>
            <button
              type="button"
              className={`${styles.filterBtn} ${selectedCategory === 'pattern_optimization' ? styles.activeFilter : ''}`}
              onClick={() => setSelectedCategory('pattern_optimization')}
            >
              Pattern Optimization
            </button>
          </div>

          <div className={styles.filterGroup}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #64748b)' }}>
              Status:
            </span>
            <button
              type="button"
              className={`${styles.filterBtn} ${selectedStatus === 'active' ? styles.activeFilter : ''}`}
              onClick={() => setSelectedStatus('active')}
            >
              Active
            </button>
            <button
              type="button"
              className={`${styles.filterBtn} ${selectedStatus === 'all' ? styles.activeFilter : ''}`}
              onClick={() => setSelectedStatus('all')}
            >
              All
            </button>
            <button
              type="button"
              className={`${styles.filterBtn} ${selectedStatus === 'completed' ? styles.activeFilter : ''}`}
              onClick={() => setSelectedStatus('completed')}
            >
              Completed
            </button>
          </div>
        </div>

        {isListLoading ? (
          <div style={{ padding: '2rem 0', textAlign: 'center' }}>
            <Spinner label="Loading recommendations..." size="md" />
          </div>
        ) : filteredRecommendations.length === 0 ? (
          <div className={styles.aiHeaderCard} style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎯</div>
            <h4 style={{ margin: '0 0 0.4rem 0', color: 'var(--text-primary, #0f172a)' }}>
              No recommendations match this filter
            </h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary, #64748b)' }}>
              Click "Refresh Recommendations" above to generate a new batch of AI-powered suggestions.
            </p>
          </div>
        ) : (
          <div className={styles.cardsGrid}>
            {filteredRecommendations.slice(0, 5).map((rec) => {
              const isAccepted = rec.status === 'accepted';
              const isCompleted = rec.status === 'completed';
              const isDismissed = rec.status === 'dismissed';

              return (
                <div key={rec.id} className={styles.recCard}>
                  <div>
                    <div className={styles.recCardTop}>
                      <span className={`${styles.categoryBadge} ${getCategoryClass(rec.category)}`}>
                        {formatCategoryName(rec.category)}
                      </span>
                      <span className={styles.impactBadge}>+{rec.impactScore} pts impact</span>
                    </div>

                    <h4 className={styles.recTitle}>{safeText(rec.title)}</h4>
                    <p className={styles.recDesc}>{safeText(rec.description)}</p>

                    <div className={styles.reasonBox}>
                      <span className={styles.reasonLabel}>Why this is suggested:</span>
                      {safeText(rec.reason)}
                    </div>
                  </div>

                  <div className={styles.cardFooter}>
                    <div className={styles.statusIndicator}>
                      <span
                        style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          display: 'inline-block',
                          backgroundColor:
                            isCompleted
                              ? '#10b981'
                              : isAccepted
                              ? '#3b82f6'
                              : isDismissed
                              ? '#94a3b8'
                              : '#f59e0b',
                        }}
                      />
                      <span>{rec.status}</span>
                    </div>

                    <div className={styles.actionBtnGroup}>
                      {rec.actionType === 'start_focus_session' && !isCompleted && (
                        <button
                          type="button"
                          className={styles.startSessionActionBtn}
                          onClick={() => navigate('/focus')}
                          title="Open focus timer and apply session"
                        >
                          ⚡ Start Session
                        </button>
                      )}

                      {!isAccepted && !isCompleted && !isDismissed && (
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${styles.acceptBtn}`}
                          onClick={() => statusMutation.mutate({ id: rec.id, status: 'accepted' })}
                          title="Accept this suggestion into your plan"
                        >
                          Accept
                        </button>
                      )}

                      {isAccepted && !isCompleted && (
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${styles.acceptBtn}`}
                          onClick={() => statusMutation.mutate({ id: rec.id, status: 'completed' })}
                          title="Mark this action as accomplished"
                        >
                          ✓ Complete
                        </button>
                      )}

                      {!isCompleted && !isDismissed && (
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${styles.dismissBtn}`}
                          onClick={() => statusMutation.mutate({ id: rec.id, status: 'dismissed' })}
                          title="Dismiss recommendation"
                        >
                          Dismiss
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

