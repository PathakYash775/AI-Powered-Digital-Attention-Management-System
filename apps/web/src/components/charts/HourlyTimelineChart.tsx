import type { HourlyUsageItem } from '../../api/types';
import styles from './HourlyTimelineChart.module.css';

interface HourlyTimelineChartProps {
  patterns: HourlyUsageItem[];
}

export function HourlyTimelineChart({ patterns = [] }: HourlyTimelineChartProps) {
  const safePatterns = Array.isArray(patterns) ? patterns : [];
  const activeHours = safePatterns.filter((p) => p && typeof p.hour === 'number' && p.hour >= 8 && p.hour <= 19);
  const displayHours = activeHours.length > 0 ? activeHours : safePatterns.slice(0, 14);

  const maxActiveSec = Math.max(...displayHours.map((p) => Number(p?.activeSec) || 0), 3600);

  return (
    <div className={styles.wrapper}>
      <div className={styles.chartHeader}>
        <div className={styles.legendIndicator}>
          <span className={styles.barIndicator} />
          <span>Active Minutes</span>
        </div>
        <div className={styles.legendIndicator}>
          <span className={styles.switchIndicator} />
          <span>Task Switches</span>
        </div>
      </div>

      <div className={styles.barsContainer} role="region" aria-label="Hourly Activity Timeline">
        {displayHours.map((item) => {
          const heightPercent = Math.min(100, Math.round((item.activeSec / maxActiveSec) * 100));
          const formattedHour = `${item.hour.toString().padStart(2, '0')}:00`;
          const activeMinutes = Math.round(item.activeSec / 60);

          return (
            <div
              key={item.hour}
              className={styles.barColumn}
              title={`${formattedHour}: ${activeMinutes}m active, ${item.switchCount} task switches`}
            >
              {item.switchCount > 0 && (
                <div className={styles.switchBadge} aria-label={`${item.switchCount} switches`}>
                  {item.switchCount}
                </div>
              )}

              <div className={styles.barTrack}>
                <div
                  className={styles.barFill}
                  style={{ height: `${Math.max(6, heightPercent)}%` }}
                />
              </div>

              <span className={styles.hourLabel}>{formattedHour}</span>
            </div>
          );
        })}
      </div>

      <div className={styles.footerNote}>
        <span>Peak activity between 10:00 & 16:00 (Engineering Core Hours)</span>
      </div>
    </div>
  );
}
