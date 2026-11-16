import type { HourlyUsageItem } from '../../api/types';
import styles from './HourlyTimelineChart.module.css';

interface HourlyTimelineChartProps {
  patterns: HourlyUsageItem[];
}

export function HourlyTimelineChart({ patterns = [] }: HourlyTimelineChartProps) {
  const safePatterns = Array.isArray(patterns) ? patterns : [];
  const activeHours = safePatterns.filter(
    (p) => p && typeof p.hour === 'number' && p.hour >= 8 && p.hour <= 19,
  );
  const displayHours =
    activeHours.length > 0
      ? activeHours
      : safePatterns.length > 0
        ? safePatterns.slice(0, 14)
        : Array.from({ length: 12 }, (_, i) => ({
            hour: i + 8,
            activeSec: 0,
            idleSec: 0,
            switchCount: 0,
            notificationCount: 0,
          }));

  const maxActiveSec = Math.max(
    ...displayHours.map((p) => Number(p?.activeSec) || 0),
    3600,
  );

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

      <div className={styles.scrollWrapper}>
        <div className={styles.barsContainer} role="region" aria-label="Hourly Activity Timeline">
          {displayHours.map((item, idx) => {
            const hour = typeof item?.hour === 'number' ? item.hour : idx + 8;
            const activeSec = Number(item?.activeSec) || 0;
            const switchCount = Number(item?.switchCount) || 0;
            const heightPercent = Math.min(100, Math.round((activeSec / maxActiveSec) * 100));
            const formattedHour = `${hour.toString().padStart(2, '0')}:00`;
            const activeMinutes = Math.round(activeSec / 60);

            return (
              <div
                key={hour}
                className={styles.barColumn}
                title={`${formattedHour}: ${activeMinutes}m active, ${switchCount} task switches`}
              >
                {switchCount > 0 && (
                  <div className={styles.switchBadge} aria-label={`${switchCount} switches`}>
                    {switchCount}
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
      </div>

      <div className={styles.footerNote}>
        <span>Peak activity between 10:00 & 16:00 (Engineering Core Hours)</span>
      </div>
    </div>
  );
}
