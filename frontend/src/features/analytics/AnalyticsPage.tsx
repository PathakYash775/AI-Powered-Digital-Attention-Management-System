import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  analyticsApi,
  type SimulateInput,
  type PredictionResult,
} from '../../api/analytics';
import { formatDuration, getTodayDateString } from '../../lib/format';
import { Spinner } from '../../components/ui/Spinner';
import { FocusSummaryWidget } from '../activity/FocusSummaryWidget';
import styles from './AnalyticsPage.module.css';

export function AnalyticsPage() {
  const todayStr = getTodayDateString();
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

  // 1. Fetch Weekly Focus Summary (Mon-Sun breakdown, weekly avg, focus sessions)
  const {
    data: weeklyData,
    isLoading: isWeeklyLoading,
    isError: isWeeklyError,
    refetch: refetchWeekly,
  } = useQuery({
    queryKey: ['analytics', 'weekly-summary', selectedDate],
    queryFn: () => analyticsApi.getWeeklySummary(selectedDate),
    staleTime: 10_000,
  });

  // 2. Fetch Focus Score & Rating (/api/v1/analytics/focus-score)
  const {
    data: focusScoreData,
    isLoading: isScoreLoading,
    isError: isScoreError,
    refetch: refetchScore,
  } = useQuery({
    queryKey: ['analytics', 'focus-score', selectedDate],
    queryFn: () => analyticsApi.getFocusScore(selectedDate),
    staleTime: 10_000,
  });

  // 3. Fetch Distraction Analysis (/api/v1/analytics/distractions)
  const {
    data: distractionsData,
    isLoading: isDistractionsLoading,
    isError: isDistractionsError,
    refetch: refetchDistractions,
  } = useQuery({
    queryKey: ['analytics', 'distractions', selectedDate],
    queryFn: () => analyticsApi.getDistractions(selectedDate),
    staleTime: 10_000,
  });

  // 4. Fetch Daily Activity Analytics (/api/v1/analytics/daily)
  const {
    data: dailyData,
    isLoading: isDailyLoading,
    isError: isDailyError,
    refetch: refetchDaily,
  } = useQuery({
    queryKey: ['analytics', 'daily', selectedDate],
    queryFn: () => analyticsApi.getDaily(selectedDate),
    staleTime: 10_000,
  });

  // 5. Fetch Summary Overview (/api/v1/analytics/summary)
  const {
    data: summaryData,
    isLoading: isSummaryLoading,
    isError: isSummaryError,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ['analytics', 'summary', selectedDate],
    queryFn: () => analyticsApi.getSummary(selectedDate),
    staleTime: 10_000,
  });

  // 6. Fetch Actionable Insights (/api/v1/analytics/insights)
  const {
    data: insightsData,
    isLoading: isInsightsLoading,
    isError: isInsightsError,
    refetch: refetchInsights,
  } = useQuery({
    queryKey: ['analytics', 'insights', selectedDate],
    queryFn: () => analyticsApi.getInsights(selectedDate),
    staleTime: 30_000,
  });

  // 7. Fetch Live ML Attention Predictions (/api/v1/analytics/predictions)
  const { data: predictionData } = useQuery({
    queryKey: ['analytics', 'predictions'],
    queryFn: () => analyticsApi.getPredictions(),
    staleTime: 30_000,
  });

  // 8. Optional Simulator Mutation (/api/v1/analytics/simulate)
  const [simForm, setSimForm] = useState<SimulateInput>({
    appName: 'Visual Studio Code',
    category: 'productive',
    hoursUsed: 2.5,
    dayUsed: 'Wednesday',
    numberEvents: 120,
    numberInteractions: 2400,
    switches: 6,
    eventSpan: 150,
  });

  const [simResult, setSimResult] = useState<PredictionResult | null>(null);

  const simulateMutation = useMutation({
    mutationFn: (payload: SimulateInput) => analyticsApi.simulate(payload),
    onSuccess: (data) => {
      setSimResult(data);
    },
  });

  const handleSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    simulateMutation.mutate(simForm);
  };

  const applyPreset = (preset: 'coding' | 'social' | 'meetings') => {
    let p: SimulateInput;
    if (preset === 'coding') {
      p = {
        appName: 'Visual Studio Code',
        category: 'productive',
        hoursUsed: 3.5,
        dayUsed: 'Wednesday',
        numberEvents: 180,
        numberInteractions: 3600,
        switches: 4,
        eventSpan: 210,
      };
    } else if (preset === 'social') {
      p = {
        appName: 'Social Media',
        category: 'social',
        hoursUsed: 2.0,
        dayUsed: 'Friday',
        numberEvents: 300,
        numberInteractions: 1200,
        switches: 26,
        eventSpan: 120,
      };
    } else {
      p = {
        appName: 'Slack & Team Calls',
        category: 'communication',
        hoursUsed: 3.0,
        dayUsed: 'Monday',
        numberEvents: 220,
        numberInteractions: 1800,
        switches: 16,
        eventSpan: 180,
      };
    }
    setSimForm(p);
    simulateMutation.mutate(p);
  };

  const isLoading =
    isWeeklyLoading ||
    isScoreLoading ||
    isDistractionsLoading ||
    isDailyLoading ||
    isSummaryLoading ||
    isInsightsLoading;

  const isAnyError =
    isWeeklyError &&
    isScoreError &&
    isDistractionsError &&
    isDailyError &&
    isSummaryError &&
    isInsightsError;


  const handleRetryAll = () => {
    refetchWeekly();
    refetchScore();
    refetchDistractions();
    refetchDaily();
    refetchSummary();
    refetchInsights();
  };

  if (isLoading) {
    return <Spinner label="Loading focus & attention analytics..." />;
  }

  // Determine if the user has any recorded activity for today/selectedDate
  const todayWeekly = weeklyData?.today;
  const hasRecordedActivity = Boolean(
    (todayWeekly && todayWeekly.hasData) ||
      (dailyData && dailyData.activeMinutes > 0) ||
      (summaryData && summaryData.totalScreenMinutes > 0)
  );

  // 1. Today's Focus Score (out of 100)
  const focusScore =
    hasRecordedActivity && todayWeekly?.focusScore !== null && todayWeekly?.focusScore !== undefined
      ? todayWeekly.focusScore
      : hasRecordedActivity && focusScoreData?.focusScore !== undefined
      ? focusScoreData.focusScore
      : null;

  // Rating & Status
  let statusText = 'No activity recorded yet';
  let statusBadgeClass = styles.badgeNoData;

  if (hasRecordedActivity && focusScore !== null) {
    if (focusScore >= 70) {
      statusText = 'Good Focus';
      statusBadgeClass = styles.badgeGood;
    } else if (focusScore >= 50) {
      statusText = 'Moderate Focus';
      statusBadgeClass = styles.badgeModerate;
    } else {
      statusText = 'Needs Improvement';
      statusBadgeClass = styles.badgeNeedsImprovement;
    }
  }

  // 2. Weekly Average (calculated from available days with data)
  const weeklyAverage = weeklyData?.weeklyAverage ?? null;
  const daysWithDataCount = weeklyData?.daysWithDataCount ?? 0;

  // 3. Today's Screen Time (total recorded screen time)
  const totalScreenMinutes =
    todayWeekly?.totalScreenMinutes ??
    summaryData?.totalScreenMinutes ??
    (dailyData ? Math.round(dailyData.totalScreenMinutes) : 0);

  const activeMinutes =
    todayWeekly?.activeMinutes ??
    summaryData?.activeMinutes ??
    (dailyData ? Math.round(dailyData.activeMinutes) : 0);

  // 4. Distraction Count
  const distractionCount = distractionsData?.distractionCount ?? 0;
  const switchCount =
    todayWeekly?.switchCount ?? distractionsData?.switchCount ?? summaryData?.switchCount ?? 0;
  const distractedMinutes =
    todayWeekly?.distractedMinutes ?? distractionsData?.distractedMinutes ?? 0;

  // 5. Focus Sessions completed today
  const completedFocusSessions = todayWeekly?.completedFocusSessions ?? 0;

  // Days breakdown (Monday to Sunday)
  const days = weeklyData?.days ?? [];

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>Analytics &amp; Focus Insights</h1>
          <p className={styles.subtitle}>
            Real-time focus tracking and weekly attention performance
          </p>
        </div>

        <div className={styles.headerControls}>
          <input
            type="date"
            className={styles.dateInput}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            aria-label="Filter analytics by date"
          />
          <div className={styles.liveBadge}>
            <span className={styles.liveDot} />
            <span>Live Data</span>
          </div>
        </div>
      </header>

      {/* Global Error Alert if all endpoints failed */}
      {isAnyError && (
        <div role="alert" className={styles.errorAlert}>
          <span>Failed to load some analytics data. Please check your connection.</span>
          <button type="button" className={styles.retryBtn} onClick={handleRetryAll}>
            Retry
          </button>
        </div>
      )}

      {/* 1. Five Summary Cards (Today's Focus, Weekly Avg, Screen Time, Distractions, Focus Sessions) */}
      <section className={styles.summaryCardsGrid} aria-label="Key attention metrics">
        {/* Card 1: Today's Focus Score */}
        <div className={styles.summaryCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>Today's Focus Score</span>
            <div className={styles.cardIcon} style={{ background: '#eff6ff', color: '#2563eb' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" />
              </svg>
            </div>
          </div>
          <div className={styles.cardValue}>
            {hasRecordedActivity && focusScore !== null ? (
              <>
                {focusScore} <span style={{ fontSize: '1rem', fontWeight: 600, color: '#64748b' }}>/ 100</span>
              </>
            ) : (
              <span className={styles.cardValueMuted}>No activity recorded yet</span>
            )}
          </div>
          <div className={styles.cardSub}>
            <span className={`${styles.statusBadge} ${statusBadgeClass}`}>
              {statusText}
            </span>
          </div>
        </div>

        {/* Card 2: Weekly Average */}
        <div className={styles.summaryCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>Weekly Average</span>
            <div className={styles.cardIcon} style={{ background: '#f0fdf4', color: '#16a34a' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
          </div>
          <div className={styles.cardValue}>
            {weeklyAverage !== null ? (
              <>
                {weeklyAverage} <span style={{ fontSize: '1rem', fontWeight: 600, color: '#64748b' }}>/ 100</span>
              </>
            ) : (
              <span className={styles.cardValueMuted}>No activity recorded yet</span>
            )}
          </div>
          <div className={styles.cardSub}>
            {daysWithDataCount > 0
              ? `Based on ${daysWithDataCount} tracked ${daysWithDataCount === 1 ? 'day' : 'days'}`
              : 'No tracked days this week'}
          </div>
        </div>

        {/* Card 3: Today's Screen Time */}
        <div className={styles.summaryCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>Today's Screen Time</span>
            <div className={styles.cardIcon} style={{ background: '#fef3c7', color: '#d97706' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
          </div>
          <div className={styles.cardValue}>
            {hasRecordedActivity || totalScreenMinutes > 0
              ? formatDuration(totalScreenMinutes * 60)
              : '0 min'}
          </div>
          <div className={styles.cardSub}>
            Active working: {hasRecordedActivity ? formatDuration(activeMinutes * 60) : '0 min'}
          </div>
        </div>

        {/* Card 4: Distraction Count */}
        <div className={styles.summaryCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>Distraction Count</span>
            <div className={styles.cardIcon} style={{ background: '#fef2f2', color: '#dc2626' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
          </div>
          <div className={styles.cardValue}>
            {hasRecordedActivity
              ? `${distractionCount} recorded`
              : <span className={styles.cardValueMuted}>No activity recorded yet</span>}
          </div>
          <div className={styles.cardSub}>
            {hasRecordedActivity
              ? `${switchCount} app ${switchCount === 1 ? 'switch' : 'switches'} • ${distractedMinutes}m distracted`
              : 'Zero distractions logged'}
          </div>
        </div>

        {/* Card 5: Focus Sessions */}
        <div className={styles.summaryCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>Focus Sessions</span>
            <div className={styles.cardIcon} style={{ background: '#f3e8ff', color: '#9333ea' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
          </div>
          <div className={styles.cardValue}>
            {completedFocusSessions} completed
          </div>
          <div className={styles.cardSub}>
            Completed sessions today
          </div>
        </div>
      </section>

      {/* 2. Weekly Focus Summary (Monday – Sunday) */}
      <section className={styles.weeklyCard} aria-label="Weekly focus summary">
        <div className={sectionHeaderStyle(styles.sectionHeader)}>
          <h2 className={styles.sectionTitle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Weekly Focus Summary (Monday – Sunday)
          </h2>
          <div className={styles.weeklyAverageBadge}>
            Weekly Average:{' '}
            <span className={styles.weeklyAverageHighlight}>
              {weeklyAverage !== null ? `${weeklyAverage} / 100` : 'No activity recorded yet'}
            </span>
          </div>
        </div>

        <div className={styles.weeklyDaysGrid}>
          {days.map((dayItem) => {
            const hasDayData = dayItem.hasData && dayItem.score !== null;
            const scoreVal = dayItem.score ?? 0;

            const fillClass =
              scoreVal >= 70
                ? styles.barFillGood
                : scoreVal >= 50
                ? styles.barFillModerate
                : styles.barFillNeedsImprovement;

            return (
              <div
                key={dayItem.date}
                className={`${styles.dayColumn} ${dayItem.isToday ? styles.todayColumn : ''}`}
              >
                <span className={styles.dayName}>{dayItem.day}</span>
                {dayItem.isToday && <span className={styles.todayPill}>Today</span>}

                <div
                  className={styles.verticalBarContainer}
                  role="progressbar"
                  aria-valuenow={hasDayData ? scoreVal : 0}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${dayItem.day} focus score`}
                >
                  {hasDayData && (
                    <div
                      className={`${styles.verticalBarFill} ${fillClass}`}
                      style={{ height: `${Math.max(12, scoreVal)}%` }}
                    />
                  )}
                </div>

                {hasDayData ? (
                  <span className={styles.dayScoreText}>{scoreVal}</span>
                ) : (
                  <span className={styles.dayEmptyText}>—</span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Attention Overview & Actionable Insights Section */}
      <section className={styles.twoColGrid}>
        {/* Left Column: Today's Attention Assessment */}
        <div className={styles.cardSection}>
          <h2 className={styles.sectionTitle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            Today's Attention Assessment
          </h2>

          <div className={styles.metricsList}>
            <div className={styles.metricRow}>
              <span className={styles.metricRowLabel}>Focus Rating</span>
              <span className={`${styles.statusBadge} ${statusBadgeClass}`}>
                {statusText}
              </span>
            </div>

            <div className={styles.metricRow}>
              <span className={styles.metricRowLabel}>Productive Tool</span>
              <span className={styles.metricRowValue}>
                {summaryData?.topProductive || (hasRecordedActivity ? 'Active apps' : 'None')}
              </span>
            </div>

            <div className={styles.metricRow}>
              <span className={styles.metricRowLabel}>Main Distraction Source</span>
              <span className={styles.metricRowValue}>
                {summaryData?.topDistraction || 'None recorded'}
              </span>
            </div>

            <div className={styles.metricRow}>
              <span className={styles.metricRowLabel}>Productive Ratio</span>
              <span className={styles.metricRowValue}>
                {focusScoreData?.metrics?.productiveRatioPercent ?? (hasRecordedActivity ? 50 : 0)}%
              </span>
            </div>

            <div className={styles.metricRow}>
              <span className={styles.metricRowLabel}>ML Distraction Risk</span>
              <span className={styles.metricRowValue} style={{ textTransform: 'capitalize' }}>
                {predictionData?.prediction?.riskLevel ?? 'Low'}
              </span>
            </div>
          </div>

          {summaryData?.summaryStatement && (
            <p style={{ fontSize: '0.82rem', color: '#64748b', fontStyle: 'italic', margin: 0 }}>
              "{summaryData.summaryStatement}"
            </p>
          )}
        </div>

        {/* Right Column: Automated Focus Insights */}
        <div className={styles.cardSection}>
          <h2 className={styles.sectionTitle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            Focus Insights &amp; Suggestions
          </h2>

          <ul className={styles.insightsList}>
            {insightsData?.insights && insightsData.insights.length > 0 ? (
              insightsData.insights.map((insight, idx) => (
                <li key={idx} className={styles.insightItem}>
                  <div className={styles.insightHeader}>
                    {insight.type === 'warning' ? (
                      <span style={{ color: '#d97706' }}>⚠️</span>
                    ) : insight.type === 'tip' ? (
                      <span style={{ color: '#2563eb' }}>💡</span>
                    ) : (
                      <span style={{ color: '#16a34a' }}>⭐</span>
                    )}
                    <span>{insight.title}</span>
                  </div>
                  <p className={styles.insightMessage}>{insight.message}</p>
                </li>
              ))
            ) : (
              <li className={styles.insightItem}>
                <div className={styles.insightHeader}>
                  <span style={{ color: '#2563eb' }}>💡</span>
                  <span>Keep Tracking</span>
                </div>
                <p className={styles.insightMessage}>
                  {hasRecordedActivity
                    ? 'Your activity patterns look steady today. Continue your productive work.'
                    : 'No activity recorded yet for this date. Start your workflow to view automated recommendations.'}
                </p>
              </li>
            )}
          </ul>
        </div>
      </section>

      {/* 4. Optional Prediction Simulator (Collapsible) */}
      <section className={styles.simulatorCard}>
        <button
          type="button"
          className={styles.simulatorToggle}
          onClick={() => setIsSimulatorOpen((prev) => !prev)}
          aria-expanded={isSimulatorOpen}
        >
          <span className={styles.simulatorToggleTitle}>
            🔬 What-If Focus Session Simulator (Optional)
          </span>
          <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
            {isSimulatorOpen ? '▲ Hide Simulator' : '▼ Test a scenario'}
          </span>
        </button>

        {isSimulatorOpen && (
          <div className={styles.simulatorBody}>
            <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
              Simulate how different tools, duration, and app switches impact your predicted attention score.
            </p>

            <div className={styles.presetRow}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>Presets:</span>
              <button
                type="button"
                className={styles.presetBtn}
                onClick={() => applyPreset('coding')}
              >
                Deep Coding Session
              </button>
              <button
                type="button"
                className={styles.presetBtn}
                onClick={() => applyPreset('social')}
              >
                Heavy Social Browsing
              </button>
              <button
                type="button"
                className={styles.presetBtn}
                onClick={() => applyPreset('meetings')}
              >
                Communication / Meetings
              </button>
            </div>

            <form onSubmit={handleSimulate} className={styles.simFormGrid}>
              <div className={styles.simField}>
                <label className={styles.simLabel}>Application / Activity</label>
                <input
                  type="text"
                  className={styles.simInput}
                  value={simForm.appName}
                  onChange={(e) => setSimForm({ ...simForm, appName: e.target.value })}
                />
              </div>

              <div className={styles.simField}>
                <label className={styles.simLabel}>Category</label>
                <select
                  className={styles.simInput}
                  value={simForm.category}
                  onChange={(e) =>
                    setSimForm({
                      ...simForm,
                      category: e.target.value as SimulateInput['category'],
                    })
                  }
                >
                  <option value="productive">Productive</option>
                  <option value="social">Social</option>
                  <option value="communication">Communication</option>
                  <option value="entertainment">Entertainment</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className={styles.simField}>
                <label className={styles.simLabel}>Hours Used</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="12"
                  className={styles.simInput}
                  value={simForm.hoursUsed}
                  onChange={(e) =>
                    setSimForm({ ...simForm, hoursUsed: parseFloat(e.target.value) || 1 })
                  }
                />
              </div>

              <div className={styles.simField}>
                <label className={styles.simLabel}>Task / App Switches</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className={styles.simInput}
                  value={simForm.switches}
                  onChange={(e) =>
                    setSimForm({ ...simForm, switches: parseInt(e.target.value, 10) || 0 })
                  }
                />
              </div>

              <button
                type="submit"
                className={styles.simSubmitBtn}
                disabled={simulateMutation.isPending}
              >
                {simulateMutation.isPending ? 'Simulating...' : 'Run Simulation'}
              </button>
            </form>

            {simResult && (
              <div className={styles.simResultBox}>
                <div>
                  <span style={{ fontWeight: 600 }}>Predicted Attention Score:</span>{' '}
                  <span className={styles.simResultScore}>
                    {simResult.prediction.attentionScore} / 100
                  </span>
                  <span style={{ marginLeft: '1rem', color: '#64748b' }}>
                    Risk: <strong>{simResult.prediction.riskLevel}</strong> • Model Engine:{' '}
                    <strong>{simResult.prediction.modelEngine}</strong>
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 5. Small My Focus Box in the bottom-left corner */}
      <FocusSummaryWidget selectedDate={selectedDate} />
    </div>
  );
}

function sectionHeaderStyle(className: string) {
  return className;
}
