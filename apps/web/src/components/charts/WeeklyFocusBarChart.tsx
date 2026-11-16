import { useState } from 'react';
import styles from './WeeklyFocusBarChart.module.css';

export interface WeeklyDayScore {
  day: string;
  score: number | null;
  hasData?: boolean;
  isToday?: boolean;
}

interface WeeklyFocusBarChartProps {
  days?: WeeklyDayScore[];
  averageScore?: number | null;
}

const FALLBACK_EMPTY_DAYS: WeeklyDayScore[] = [
  { day: 'Mon', score: null, hasData: false },
  { day: 'Tue', score: null, hasData: false },
  { day: 'Wed', score: null, hasData: false },
  { day: 'Thu', score: null, hasData: false },
  { day: 'Fri', score: null, hasData: false },
  { day: 'Sat', score: null, hasData: false },
  { day: 'Sun', score: null, hasData: false },
];

export function WeeklyFocusBarChart({ days, averageScore }: WeeklyFocusBarChartProps) {
  const [selectedWeek, setSelectedWeek] = useState('current');
  const chartDays = days && days.length > 0 ? days : FALLBACK_EMPTY_DAYS;
  const validScores = chartDays
    .filter((d) => Boolean(d.hasData && d.score !== null))
    .map((d) => d.score as number);

  const avg =
    averageScore !== undefined && averageScore !== null
      ? averageScore
      : validScores.length > 0
      ? Math.round(validScores.reduce((acc, s) => acc + s, 0) / validScores.length)
      : null;

  const trackedCount = validScores.length;

  return (
    <div className={styles.wrapper}>
      {/* Header with Average Score & Status Badge */}
      <div className={styles.headerRow}>
        <div className={styles.avgBadge}>
          <span className={styles.avgLabel}>Weekly Avg</span>
          <div className={styles.avgScoreGroup}>
            <span className={styles.avgValue}>{avg !== null ? `${avg}/100` : '—'}</span>
            {avg !== null && (
              <span
                className={`${styles.statusChip} ${
                  avg >= 70
                    ? styles.statusGood
                    : avg >= 50
                    ? styles.statusModerate
                    : styles.statusBuilding
                }`}
              >
                {avg >= 70 ? 'Optimal' : avg >= 50 ? 'Moderate' : 'Building'}
              </span>
            )}
          </div>
        </div>

        <div className={styles.weekSelectWrapper}>
          <select
            className={styles.weekSelect}
            aria-label="Select focus week"
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
          >
            <option value="current">Current Week</option>
            <option value="previous">Previous Week</option>
          </select>
        </div>
      </div>

      {/* Main Chart Card Area */}
      <div className={styles.chartContainer}>
        {/* 7 Days Bar Grid */}
        <div className={styles.chartArea} role="img" aria-label="Weekly focus score bar chart">
          {chartDays.map((item, index) => {
            const hasScore = Boolean(item.hasData && item.score !== null);
            const scoreVal = hasScore ? item.score! : 0;
            // Height calculation: minimum 16% height for a pleasing rounded pill cap
            const heightPercent = hasScore ? Math.max(16, Math.min(100, scoreVal)) : 0;

            const scoreToneClass =
              scoreVal >= 70
                ? styles.fillGood
                : scoreVal >= 50
                ? styles.fillModerate
                : styles.fillActive;

            return (
              <div
                key={`${item.day}-${index}`}
                className={`${styles.barColumn} ${item.isToday ? styles.todayColumn : ''}`}
                title={`${item.day}: ${hasScore ? `${scoreVal}/100 Focus Score` : 'No activity logged'}`}
              >
                {/* Score Number on Top */}
                <div className={hasScore ? styles.scoreTop : styles.scoreTopMuted}>
                  {hasScore ? scoreVal : '—'}
                </div>

                {/* Sleek Rounded Bar Track & Fill */}
                <div className={styles.barTrack}>
                  {hasScore && (
                    <div
                      className={`${styles.barFill} ${scoreToneClass} ${
                        item.isToday ? styles.todayFill : ''
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    >
                      {item.isToday && <div className={styles.todayIndicatorCap} />}
                    </div>
                  )}
                </div>

                {/* Day Label & Today Dot */}
                <div className={styles.dayLabelContainer}>
                  <span className={`${styles.dayLabel} ${item.isToday ? styles.todayLabel : ''}`}>
                    {item.day}
                  </span>
                  {item.isToday && <span className={styles.todayDot} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Info Strip */}
      <div className={styles.chartFooter}>
        <span className={styles.footerInfo}>
          <span className={styles.footerBullet}>●</span> {trackedCount} of 7 days tracked
        </span>
        <span className={styles.footerTarget}>Target: 70+ Focus</span>
      </div>
    </div>
  );
}
