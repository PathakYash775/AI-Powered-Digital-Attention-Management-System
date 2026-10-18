import { formatDuration } from '../../lib/format';
import styles from './CategoryDonutChart.module.css';

interface CategoryDonutChartProps {
  categories: {
    productive: number;
    communication: number;
    entertainment: number;
    social: number;
    other: number;
  };
  totalSec: number;
}

const CATEGORY_CONFIG: Record<
  string,
  { label: string; color: string; gradient: string }
> = {
  productive: {
    label: 'Productive Work',
    color: '#10b981',
    gradient: 'linear-gradient(135deg, #10b981, #059669)',
  },
  communication: {
    label: 'Communication',
    color: '#6366f1',
    gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)',
  },
  entertainment: {
    label: 'Entertainment',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
  },
  social: {
    label: 'Social & Media',
    color: '#ec4899',
    gradient: 'linear-gradient(135deg, #ec4899, #db2777)',
  },
  other: {
    label: 'Other & Utility',
    color: '#94a3b8',
    gradient: 'linear-gradient(135deg, #94a3b8, #64748b)',
  },
};

export function CategoryDonutChart({ categories, totalSec }: CategoryDonutChartProps) {
  const safeTotal = totalSec > 0 ? totalSec : 1;

  const entries = Object.entries(categories)
    .filter(([, sec]) => sec > 0)
    .map(([key, sec]) => ({
      key,
      sec,
      percent: Math.round((sec / safeTotal) * 100),
      config: CATEGORY_CONFIG[key] ?? {
        label: key,
        color: '#94a3b8',
        gradient: '#94a3b8',
      },
    }));

  const radius = 70;
  const circumference = 2 * Math.PI * radius;

  let accumulatedOffset = 0;
  const arcs = entries.map((entry) => {
    const strokeLength = (entry.sec / safeTotal) * circumference;
    const strokeDasharray = `${strokeLength} ${circumference - strokeLength}`;
    const strokeDashoffset = -accumulatedOffset;
    accumulatedOffset += strokeLength;
    return {
      ...entry,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const productiveSec = categories.productive ?? 0;
  const productivePercent = Math.round((productiveSec / safeTotal) * 100);

  return (
    <div className={styles.wrapper}>
      <div className={styles.chartArea}>
        <svg
          viewBox="0 0 180 180"
          className={styles.svg}
          role="img"
          aria-label="Category usage distribution pie chart"
        >
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke="var(--color-neutral-subtle)"
            strokeWidth="18"
          />
          {arcs.map((arc) => (
            <circle
              key={arc.key}
              cx="90"
              cy="90"
              r={radius}
              fill="none"
              stroke={arc.config.color}
              strokeWidth="18"
              strokeDasharray={arc.strokeDasharray}
              strokeDashoffset={arc.strokeDashoffset}
              strokeLinecap="round"
              className={styles.arc}
            />
          ))}
        </svg>

        <div className={styles.centerLabel}>
          <span className={styles.centerPercent}>{productivePercent}%</span>
          <span className={styles.centerSub}>Productive</span>
        </div>
      </div>

      <div className={styles.legend}>
        {entries.map((entry) => (
          <div key={entry.key} className={styles.legendItem}>
            <div className={styles.legendHeader}>
              <span
                className={styles.dot}
                style={{ backgroundColor: entry.config.color }}
              />
              <span className={styles.legendLabel}>{entry.config.label}</span>
              <span className={styles.legendPercent}>{entry.percent}%</span>
            </div>
            <span className={styles.legendDuration}>{formatDuration(entry.sec)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
