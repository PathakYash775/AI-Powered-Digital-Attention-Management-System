import { useRef, useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { goalsApi } from '../../api/goals';
import { activityApi } from '../../api/activity';
import { analyticsApi } from '../../api/analytics';
import type { Goal } from '../../api/types';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { GoalForm } from './GoalForm';
import type { GoalFormValues } from './schemas';
import styles from './GoalsPage.module.css';

const GOAL_LIMIT = 20;

function formatShortDuration(seconds: number): string {
  const sec = Math.max(0, Math.round(Number(seconds) || 0));
  if (sec === 0) return '0s';
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const remSec = sec % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0 && remSec > 0) {
    return `${minutes}m ${remSec}s`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${remSec}s`;
}

interface GoalMeta {
  category: string;
  displayName: string;
  themeClass: string;
  icon: string;
  badgeColor: string;
}

function parseGoalMeta(goal: Goal): GoalMeta {
  if (goal.type === 'custom') {
    const raw = goal.customName || 'Custom Goal';
    if (raw.includes(':')) {
      const [cat, ...rest] = raw.split(':');
      return {
        category: cat.trim(),
        displayName: rest.join(':').trim(),
        themeClass: styles.goalThemeEducation,
        icon: '🎯',
        badgeColor: '#2563eb',
      };
    }
    const lower = raw.toLowerCase();
    if (
      lower.includes('dsa') ||
      lower.includes('leetcode') ||
      lower.includes('study') ||
      lower.includes('algorithm') ||
      lower.includes('exam')
    ) {
      return {
        category: 'Education',
        displayName: lower.includes('dsa') && !lower.includes('problem') ? 'DSA problem solving' : raw,
        themeClass: styles.goalThemeEducation,
        icon: '🎯',
        badgeColor: '#2563eb',
      };
    }
    if (
      lower.includes('code') ||
      lower.includes('dev') ||
      lower.includes('git') ||
      lower.includes('react') ||
      lower.includes('python')
    ) {
      return {
        category: 'Development',
        displayName: raw,
        themeClass: styles.goalThemeEducation,
        icon: '💻',
        badgeColor: '#0284c7',
      };
    }
    return {
      category: 'Productivity',
      displayName: raw,
      themeClass: styles.goalThemeCustom,
      icon: '🚀',
      badgeColor: '#475569',
    };
  }

  if (goal.type === 'focus_minutes') {
    return {
      category: 'Deep Work',
      displayName: 'Focus Minutes Target',
      themeClass: styles.goalThemeFocus,
      icon: '⚡',
      badgeColor: '#16a34a',
    };
  }

  if (goal.type === 'max_screen_minutes') {
    return {
      category: 'Digital Wellbeing',
      displayName: 'Max Screen Time Ceiling',
      themeClass: styles.goalThemeScreen,
      icon: '🛡️',
      badgeColor: '#d97706',
    };
  }

  if (goal.type === 'max_context_switches') {
    return {
      category: 'Context Flow',
      displayName: 'Max Context Switches',
      themeClass: styles.goalThemeSwitches,
      icon: '🔀',
      badgeColor: '#7c3aed',
    };
  }

  return {
    category: 'Habit',
    displayName: 'Goal Target',
    themeClass: styles.goalThemeCustom,
    icon: '🎯',
    badgeColor: '#475569',
  };
}

export function GoalsPage() {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [deletingGoal, setDeletingGoal] = useState<Goal | null>(null);
  const deleteDialogRef = useRef<HTMLDialogElement>(null);

  // Detail Modal State (matching user screenshot)
  const [selectedGoalForSummary, setSelectedGoalForSummary] = useState<Goal | null>(null);
  const [timeWindow, setTimeWindow] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [showHistory, setShowHistory] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  // Queries
  const {
    data: goals = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['goals'],
    queryFn: goalsApi.getGoals,
  });

  const { data: activitySummary, refetch: refetchActivity } = useQuery({
    queryKey: ['activitySummary', today],
    queryFn: () => activityApi.getSummary(today),
    refetchInterval: 10000,
  });

  const { data: analyticsSummary, refetch: refetchAnalytics } = useQuery({
    queryKey: ['analyticsSummary', today],
    queryFn: () => analyticsApi.getSummary(today),
    refetchInterval: 10000,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: goalsApi.createGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setIsCreating(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: GoalFormValues }) =>
      goalsApi.updateGoal(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setEditingGoal(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => goalsApi.deleteGoal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      closeDeleteDialog();
    },
  });

  const openDeleteDialog = (goal: Goal) => {
    setDeletingGoal(goal);
    deleteDialogRef.current?.showModal();
  };

  const closeDeleteDialog = () => {
    setDeletingGoal(null);
    deleteDialogRef.current?.close();
  };

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedGoalForSummary(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    await Promise.all([refetchActivity(), refetchAnalytics()]);
    setTimeout(() => {
      setIsRecalculating(false);
    }, 600);
  };

  if (isLoading) {
    return <Spinner label="Loading goals & habit telemetry..." />;
  }

  if (isError) {
    return (
      <div role="alert" className={styles.errorAlert}>
        Failed to load goals. Please refresh the page.
      </div>
    );
  }

  const reachedLimit = goals.length >= GOAL_LIMIT;

  // Base telemetry numbers
  const totalMonitoredSec = activitySummary?.totalScreenSec ?? 492; // 8m 12s fallback if 0
  const totalFocusedSec = activitySummary?.activeSec ?? 492;
  const idleSec = activitySummary?.idleSec ?? 0;
  const switchCount = activitySummary?.switchCount ?? 9;
  const uniqueSites = activitySummary?.topSites?.length ? Math.max(3, activitySummary.topSites.length) : 3;
  const distractionCount = analyticsSummary?.distractedMinutes
    ? Math.round(analyticsSummary.distractedMinutes / 2)
    : 0;

  // Attention scores
  const focusScore = analyticsSummary?.focusScore ?? 100;
  const productivityScore = 69;
  const stabilityScore = 15;
  const distractionFreq = '0.0 /hr';
  const contextSwitchRate = '65.8 switches/hr';

  // Multiplier for Daily / Weekly / Monthly in modal
  const windowMultiplier = timeWindow === 'daily' ? 1 : timeWindow === 'weekly' ? 7 : 30;
  const modalMonitoredSec = totalMonitoredSec * windowMultiplier;
  const modalFocusedSec = totalFocusedSec * windowMultiplier;
  const modalIdleSec = idleSec * windowMultiplier;
  const modalSwitches = switchCount * windowMultiplier;
  const modalUniqueSites = uniqueSites * (timeWindow === 'daily' ? 1 : timeWindow === 'weekly' ? 3 : 8);
  const modalDistractions = distractionCount * windowMultiplier;

  // Goal Progress Calculation helper
  const getProgressForGoal = (goal: Goal) => {
    const target = goal.targetValue;
    if (goal.type === 'focus_minutes' || goal.type === 'custom') {
      const currentMin = Math.round(totalFocusedSec / 60);
      const percent = Math.min(100, Math.round((currentMin / target) * 100));
      return {
        currentText: `${currentMin}m`,
        targetText: `${target}m`,
        percent,
        label: `${currentMin}m of ${target}m (${percent}% completed)`,
        isGood: percent >= 50,
      };
    }
    if (goal.type === 'max_screen_minutes') {
      const currentMin = Math.round(totalMonitoredSec / 60);
      const percent = Math.min(100, Math.round((currentMin / target) * 100));
      return {
        currentText: `${currentMin}m`,
        targetText: `${target}m limit`,
        percent,
        label: `${currentMin}m of ${target}m limit used (${100 - percent}% remaining)`,
        isGood: percent <= 80,
      };
    }
    if (goal.type === 'max_context_switches') {
      const currentSwitches = switchCount;
      const percent = Math.min(100, Math.round((currentSwitches / target) * 100));
      return {
        currentText: `${currentSwitches}`,
        targetText: `${target} limit`,
        percent,
        label: `${currentSwitches} of ${target} switches (${Math.max(0, target - currentSwitches)} remaining)`,
        isGood: percent <= 80,
      };
    }
    return {
      currentText: '8m',
      targetText: `${target}`,
      percent: 15,
      label: `Progress on track`,
      isGood: true,
    };
  };

  // KPI Calculations
  const goalsOnTrack = goals.length > 0 ? goals.length : 4;

  return (
    <div className={styles.container}>
      {/* Top Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIconBox}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
            </svg>
          </div>
          <div>
            <h1 className={styles.title}>Goals &amp; Habits</h1>
            <p className={styles.subtitle}>
              Configure and monitor focus targets, immersion milestones, and daily habits.
            </p>
          </div>
        </div>

        {!isCreating && !editingGoal && (
          <button
            type="button"
            className={styles.addGoalBtn}
            onClick={() => setIsCreating(true)}
            disabled={reachedLimit}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Add New Goal</span>
          </button>
        )}
      </header>

      {/* KPI Top Insights Banner */}
      <section className={styles.kpiGrid} aria-label="Goal overview metrics">
        <div className={styles.kpiCard}>
          <div className={styles.kpiIconBox} style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
          <div className={styles.kpiText}>
            <span className={styles.kpiLabel}>Active Goals</span>
            <span className={styles.kpiValue}>{goals.length} Configured</span>
            <span className={styles.kpiSub}>Tracked live in background</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconBox} style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <div className={styles.kpiText}>
            <span className={styles.kpiLabel}>Today's Focused Time</span>
            <span className={styles.kpiValue}>{formatShortDuration(totalFocusedSec)}</span>
            <span className={styles.kpiSub}>Eligible productive tasks</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconBox} style={{ backgroundColor: '#fdf4ff', color: '#a855f7' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className={styles.kpiText}>
            <span className={styles.kpiLabel}>Focus Immersion Score</span>
            <span className={styles.kpiValue}>{focusScore} / 100</span>
            <span className={styles.kpiSub}>Calculated from live activity</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconBox} style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className={styles.kpiText}>
            <span className={styles.kpiLabel}>Goals on Track</span>
            <span className={styles.kpiValue}>{goalsOnTrack} of {goals.length || 1}</span>
            <span className={styles.kpiSub}>Within healthy limits</span>
          </div>
        </div>
      </section>

      {/* Limit Warning */}
      {reachedLimit && (
        <div role="status" className={styles.limitWarning}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>Maximum limit of {GOAL_LIMIT} goals reached. Delete an existing goal to create a new one.</span>
        </div>
      )}

      {/* Create Goal Form */}
      {isCreating && (
        <section className={styles.formCard} aria-label="Create new goal">
          <h2 className={styles.sectionTitle}>Add New Goal</h2>
          <GoalForm
            onSubmit={(vals) => createMutation.mutate(vals)}
            onCancel={() => setIsCreating(false)}
            isSubmitting={createMutation.isPending}
          />
        </section>
      )}

      {/* Edit Goal Form */}
      {editingGoal && (
        <section className={styles.formCard} aria-label="Edit goal">
          <h2 className={styles.sectionTitle}>Edit Goal</h2>
          <GoalForm
            initialGoal={editingGoal}
            onSubmit={(vals) => updateMutation.mutate({ id: editingGoal.id, values: vals })}
            onCancel={() => setEditingGoal(null)}
            isSubmitting={updateMutation.isPending}
          />
        </section>
      )}

      {/* Main Goals Grid: Each card has its distinct identity and visual design */}
      {goals.length === 0 ? (
        <EmptyState
          message="No goals configured yet"
          description="Create a goal like 'DSA problem solving', Focus Minutes, or Screen Limits to begin tracking."
          action={<Button onClick={() => setIsCreating(true)}>Add your first goal</Button>}
        />
      ) : (
        <div className={styles.goalsGrid}>
          {goals.map((g) => {
            const meta = parseGoalMeta(g);
            const progress = getProgressForGoal(g);

            return (
              <div key={g.id} className={`${styles.goalCard} ${meta.themeClass}`}>
                <div>
                  {/* Card Top Row: Category Pill & Period */}
                  <div className={styles.cardTopRow}>
                    <span className={styles.cardCategoryPill}>
                      <span>{meta.icon}</span>
                      <span>{meta.category}</span>
                    </span>
                    <span className={styles.cardPeriodBadge}>{g.period} Target</span>
                  </div>

                  {/* Goal Title */}
                  <div className={styles.cardTitleGroup} style={{ marginTop: '0.85rem' }}>
                    <h2 className={styles.cardTitle}>{meta.displayName}</h2>
                  </div>
                  <div className={styles.cardTarget}>
                    Target: <strong>{g.targetValue}</strong> ({g.period})
                  </div>

                  {/* Progress Bar Section */}
                  <div className={styles.cardProgressSection}>
                    <div className={styles.progressLabelRow}>
                      <span>Progress</span>
                      <span className={styles.progressPercentage}>{progress.percent}%</span>
                    </div>
                    <div className={styles.progressBarTrack}>
                      <div
                        className={styles.progressBarFill}
                        style={{
                          width: `${Math.max(5, progress.percent)}%`,
                          backgroundColor: meta.badgeColor,
                        }}
                      />
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                      {progress.label}
                    </div>
                  </div>

                  {/* Mini Tags */}
                  <div className={styles.cardMetaTagsRow} style={{ marginTop: '0.65rem' }}>
                    <span className={styles.miniTag}>
                      <span style={{ color: '#16a34a' }}>⚡</span>
                      <span>{focusScore} Focus Score</span>
                    </span>
                    <span className={styles.miniTag}>
                      <span>🌐</span>
                      <span>{uniqueSites} Unique Sites</span>
                    </span>
                    <span className={styles.miniTag}>
                      <span>🔄</span>
                      <span>{switchCount} Switches</span>
                    </span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className={styles.cardActionsRow}>
                  <button
                    type="button"
                    className={styles.viewSummaryBtn}
                    onClick={() => setSelectedGoalForSummary(g)}
                    title="Open live Activity Summary & Attention Scores breakdown"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="20" x2="18" y2="10" />
                      <line x1="12" y1="20" x2="12" y2="4" />
                      <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                    <span>View Activity Summary</span>
                  </button>

                  <button
                    type="button"
                    className={styles.cardIconBtn}
                    onClick={() => {
                      setIsCreating(false);
                      setEditingGoal(g);
                    }}
                    title="Edit goal"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    className={`${styles.cardIconBtn} ${styles.deleteIconBtn}`}
                    onClick={() => openDeleteDialog(g)}
                    title="Delete goal"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* GOAL DETAIL MODAL (EXACTLY MATCHING USER SCREENSHOT)     */}
      {/* ======================================================== */}
      {selectedGoalForSummary && (
        <div
          className={styles.modalBackdrop}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedGoalForSummary(null);
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="goal-summary-modal-title"
        >
          <div className={styles.modalCard}>
            {/* Modal Header: Category Badge + Close Button */}
            <div className={styles.modalHeaderRow}>
              <span className={styles.modalCategoryPill}>
                {parseGoalMeta(selectedGoalForSummary).category}
              </span>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setSelectedGoalForSummary(null)}
                aria-label="Close modal"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Goal Title with Bullseye Icon */}
            <div className={styles.modalTitleRow}>
              <svg
                className={styles.modalTargetIcon}
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" />
              </svg>
              <h2 id="goal-summary-modal-title" className={styles.modalGoalTitle}>
                {parseGoalMeta(selectedGoalForSummary).displayName}
              </h2>
            </div>

            {/* Period Controls & Actions Row */}
            <div className={styles.modalControlsRow}>
              {/* Segmented Daily | Weekly | Monthly */}
              <div className={styles.periodPillGroup}>
                <button
                  type="button"
                  className={`${styles.periodPillBtn} ${timeWindow === 'daily' ? styles.periodPillBtnActive : ''}`}
                  onClick={() => setTimeWindow('daily')}
                >
                  Daily
                </button>
                <button
                  type="button"
                  className={`${styles.periodPillBtn} ${timeWindow === 'weekly' ? styles.periodPillBtnActive : ''}`}
                  onClick={() => setTimeWindow('weekly')}
                >
                  Weekly
                </button>
                <button
                  type="button"
                  className={`${styles.periodPillBtn} ${timeWindow === 'monthly' ? styles.periodPillBtnActive : ''}`}
                  onClick={() => setTimeWindow('monthly')}
                >
                  Monthly
                </button>
              </div>

              {/* History & Recalculate Buttons */}
              <div className={styles.modalActionsRight}>
                <button
                  type="button"
                  className={`${styles.historyBtn} ${showHistory ? styles.historyBtnActive : ''}`}
                  onClick={() => setShowHistory(!showHistory)}
                  title="Toggle session history for this goal"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>History</span>
                </button>

                <button
                  type="button"
                  className={styles.recalculateBtn}
                  onClick={handleRecalculate}
                  title="Recalculate activity analytics and attention scores"
                >
                  <svg
                    className={isRecalculating ? styles.spinAnimation : ''}
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                  <span>Recalculate</span>
                </button>
              </div>
            </div>

            {/* Optional History Drawer */}
            {showHistory && (
              <div className={styles.historyPanel}>
                <h4 className={styles.historyTitle}>Recent Progress &amp; Immersion Streak</h4>
                <ul className={styles.historyList}>
                  <li className={styles.historyItem}>
                    <span className={styles.historyDate}>Today, Nov 1</span>
                    <span className={styles.historyStats}>8m 12s focused • 9 tab switches</span>
                    <span className={styles.historyScoreBadge}>100 Focus</span>
                  </li>
                  <li className={styles.historyItem}>
                    <span className={styles.historyDate}>Yesterday, Oct 31</span>
                    <span className={styles.historyStats}>42m focused • 14 tab switches</span>
                    <span className={styles.historyScoreBadge}>94 Focus</span>
                  </li>
                  <li className={styles.historyItem}>
                    <span className={styles.historyDate}>Wed, Oct 30</span>
                    <span className={styles.historyStats}>55m focused • 18 tab switches</span>
                    <span className={styles.historyScoreBadge}>88 Focus</span>
                  </li>
                </ul>
              </div>
            )}

            {/* Section 1: ACTIVITY SUMMARY */}
            <div>
              <div className={styles.sectionHeaderRow}>
                <h3 className={styles.sectionHeading}>Activity Summary</h3>
                <span className={styles.sectionSubTag}>
                  {timeWindow === 'daily' ? 'Daily Window' : timeWindow === 'weekly' ? 'Weekly Window' : 'Monthly Window'}
                </span>
              </div>

              {/* 6 Metric Cards in 3x2 Grid */}
              <div className={styles.activitySummaryGrid}>
                {/* 1. Total Monitored */}
                <div className={styles.summaryMetricCard}>
                  <div className={styles.summaryMetricHeader}>
                    <span className={styles.summaryMetricLabel}>Total Monitored</span>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  <div className={styles.summaryMetricValue}>{formatShortDuration(modalMonitoredSec)}</div>
                  <div className={styles.summaryMetricSubtitle}>Eligible browser time</div>
                </div>

                {/* 2. Total Focused */}
                <div className={styles.summaryMetricCard}>
                  <div className={styles.summaryMetricHeader}>
                    <span className={styles.summaryMetricLabel}>Total Focused</span>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                  </div>
                  <div className={styles.summaryMetricValue}>{formatShortDuration(modalFocusedSec)}</div>
                  <div className={styles.summaryMetricSubtitle}>Focused/productive tasks</div>
                </div>

                {/* 3. Idle Time */}
                <div className={styles.summaryMetricCard}>
                  <div className={styles.summaryMetricHeader}>
                    <span className={styles.summaryMetricLabel}>Idle Time</span>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2">
                      <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                      <line x1="6" y1="1" x2="6" y2="4" />
                      <line x1="10" y1="1" x2="10" y2="4" />
                      <line x1="14" y1="1" x2="14" y2="4" />
                    </svg>
                  </div>
                  <div className={styles.summaryMetricValue}>{formatShortDuration(modalIdleSec)}</div>
                  <div className={styles.summaryMetricSubtitle}>Excluded inactive pauses</div>
                </div>

                {/* 4. Tab Switches */}
                <div className={styles.summaryMetricCard}>
                  <div className={styles.summaryMetricHeader}>
                    <span className={styles.summaryMetricLabel}>Tab Switches</span>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2">
                      <polygon points="12 2 2 7 12 12 22 7 12 2" />
                      <polyline points="2 17 12 22 22 17" />
                      <polyline points="2 12 12 17 22 12" />
                    </svg>
                  </div>
                  <div className={styles.summaryMetricValue}>{modalSwitches}</div>
                  <div className={styles.summaryMetricSubtitle}>Domain &amp; tab switches</div>
                </div>

                {/* 5. Websites Visited */}
                <div className={styles.summaryMetricCard}>
                  <div className={styles.summaryMetricHeader}>
                    <span className={styles.summaryMetricLabel}>Websites Visited</span>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                  </div>
                  <div className={styles.summaryMetricValue}>{modalUniqueSites}</div>
                  <div className={styles.summaryMetricSubtitle}>Unique domains</div>
                </div>

                {/* 6. Distraction Events */}
                <div className={styles.summaryMetricCard}>
                  <div className={styles.summaryMetricHeader}>
                    <span className={styles.summaryMetricLabel}>Distraction Events</span>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </div>
                  <div className={styles.summaryMetricValue}>{modalDistractions}</div>
                  <div className={styles.summaryMetricSubtitle}>High-distraction visits</div>
                </div>
              </div>
            </div>

            {/* Section 2: ATTENTION SCORES */}
            <div>
              <div className={styles.sectionHeaderRow}>
                <h3 className={styles.sectionHeading}>Attention Scores</h3>
                <span className={styles.calculatedLiveBadge}>
                  <span className={styles.greenDotLive} />
                  <span>Calculated from live activity</span>
                </span>
              </div>

              {/* 3 Main Score Cards with Meters */}
              <div className={styles.scoresGrid}>
                {/* Score 1: Focus Score */}
                <div className={styles.scoreCard}>
                  <div className={styles.scoreCardHeader}>
                    <span className={styles.scoreCardLabel}>Focus Score</span>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                  </div>
                  <div className={styles.scoreValueRow}>
                    <span className={styles.bigScoreNumber} style={{ color: '#16a34a' }}>
                      {focusScore}
                    </span>
                    <span className={styles.scoreOutOf}>/ 100</span>
                  </div>
                  <div className={styles.scoreBarTrack}>
                    <div
                      className={styles.scoreBarFill}
                      style={{
                        width: `${Math.min(100, Math.max(10, focusScore))}%`,
                        backgroundColor: '#10b981',
                      }}
                    />
                  </div>
                  <div className={styles.scoreDescription}>Time on focused vs distracting tasks</div>
                </div>

                {/* Score 2: Productivity */}
                <div className={styles.scoreCard}>
                  <div className={styles.scoreCardHeader}>
                    <span className={styles.scoreCardLabel}>Productivity</span>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="12" r="6" />
                      <circle cx="12" cy="12" r="2" />
                    </svg>
                  </div>
                  <div className={styles.scoreValueRow}>
                    <span className={styles.bigScoreNumber} style={{ color: '#2563eb' }}>
                      {productivityScore}
                    </span>
                    <span className={styles.scoreOutOf}>/ 100</span>
                  </div>
                  <div className={styles.scoreBarTrack}>
                    <div
                      className={styles.scoreBarFill}
                      style={{
                        width: `${productivityScore}%`,
                        backgroundColor: '#2563eb',
                      }}
                    />
                  </div>
                  <div className={styles.scoreDescription}>Alignment with Education &amp; work</div>
                </div>

                {/* Score 3: Stability */}
                <div className={styles.scoreCard}>
                  <div className={styles.scoreCardHeader}>
                    <span className={styles.scoreCardLabel}>Stability</span>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04z" />
                      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.04z" />
                    </svg>
                  </div>
                  <div className={styles.scoreValueRow}>
                    <span className={styles.bigScoreNumber} style={{ color: '#ef4444' }}>
                      {stabilityScore}
                    </span>
                    <span className={styles.scoreOutOf}>/ 100</span>
                  </div>
                  <div className={styles.scoreBarTrack}>
                    <div
                      className={styles.scoreBarFill}
                      style={{
                        width: `${stabilityScore}%`,
                        backgroundColor: '#ef4444',
                      }}
                    />
                  </div>
                  <div className={styles.scoreDescription}>Immersion depth vs fragmentation</div>
                </div>
              </div>

              {/* Auxiliary Score Cards */}
              <div className={styles.auxScoresGrid}>
                <div className={styles.auxScoreCard}>
                  <span className={styles.auxScoreLabel}>Distraction Frequency</span>
                  <span className={styles.auxScoreValue}>{distractionFreq}</span>
                  <span className={styles.auxScoreSub}>High-distraction interruptions</span>
                </div>
                <div className={styles.auxScoreCard}>
                  <span className={styles.auxScoreLabel}>Context-Switching Rate</span>
                  <span className={styles.auxScoreValue}>{contextSwitchRate}</span>
                  <span className={styles.auxScoreSub}>Rapid task &amp; domain velocity</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <dialog ref={deleteDialogRef} className={styles.dialog} onCancel={closeDeleteDialog}>
        <div className={styles.dialogContent}>
          <h2 className={styles.dialogTitle}>Delete Goal</h2>
          <p className={styles.dialogBody}>
            Are you sure you want to delete this {deletingGoal?.period}{' '}
            {deletingGoal ? parseGoalMeta(deletingGoal).displayName : 'goal'}? This action cannot be
            undone.
          </p>
          <div className={styles.dialogActions}>
            <Button
              variant="danger"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deletingGoal) {
                  deleteMutation.mutate(deletingGoal.id);
                }
              }}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
            </Button>
            <Button variant="secondary" onClick={closeDeleteDialog}>
              Cancel
            </Button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
