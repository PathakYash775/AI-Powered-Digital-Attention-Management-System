import { useQuery } from '@tanstack/react-query';
import { goalsApi } from '../../api/goals';
import { Spinner } from '../../components/ui/Spinner';
import styles from './HabitFormationBar.module.css';

export function HabitFormationBar() {
  const { data: habit, isLoading } = useQuery({
    queryKey: ['goals', 'habits'],
    queryFn: () => goalsApi.getHabitProgress(),
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className={styles.habitCard} style={{ textAlign: 'center', padding: '1.5rem' }}>
        <Spinner label="Loading habit streaks..." size="sm" />
      </div>
    );
  }

  const streak = habit?.currentStreak ?? 0;
  const longest = habit?.longestStreak ?? streak;
  const completionRate = habit?.weeklyCompletionRate ?? 0;
  const habitScore = habit?.habitScore ?? 0;
  const history = habit?.historyDays ?? [];

  return (
    <section className={styles.habitCard} aria-label="Habit Formation & Streak Monitoring">
      <div className={styles.habitTopRow}>
        <div className={styles.streakInfo}>
          <div className={styles.flameBadge} aria-hidden="true">
            🔥
          </div>
          <div>
            <h2 className={styles.streakCount}>
              {streak} Day Focus Streak
            </h2>
            <p className={styles.streakSub}>
              Longest streak: {longest} days · Consistent daily goal achievement builds deep attention stamina.
            </p>
          </div>
        </div>

        <div className={styles.kpiRow}>
          <div className={styles.kpiItem}>
            <span className={styles.kpiLabel}>Weekly Completion</span>
            <span className={styles.kpiVal} style={{ color: completionRate >= 70 ? '#10b981' : 'var(--color-primary, #7047eb)' }}>
              {completionRate}%
            </span>
          </div>

          <div className={styles.kpiItem}>
            <span className={styles.kpiLabel}>Habit Score</span>
            <span className={styles.kpiVal} style={{ color: '#3b82f6' }}>
              {habitScore} / 100
            </span>
          </div>
        </div>
      </div>

      <div className={styles.daysGrid} aria-label="7-day consistency history">
        {history.map((day) => {
          const isComplete = day.percent >= 100;
          const isPartial = day.percent > 0 && day.percent < 100;
          const label = new Date(day.date).toLocaleDateString(undefined, { weekday: 'short' });

          return (
            <div key={day.date} className={styles.dayCol} title={`${day.date}: ${day.completed}/${day.totalGoals} goals completed (${day.percent}%)`}>
              <span className={styles.dayDate}>{label}</span>
              <div
                className={`${styles.dayIndicator} ${
                  isComplete ? styles.daySuccess : isPartial ? styles.dayPartial : styles.dayEmpty
                }`}
              >
                {isComplete ? '✓' : isPartial ? `${Math.round(day.percent)}%` : '—'}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

