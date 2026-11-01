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
  const safeTotal = typeof totalSec === 'number' && !isNaN(totalSec) && totalSec > 0 ? totalSec : 1;

  // Normalize categories if passed as an array or object
  const normalizedCategories: Record<string, number> = {
    productive: 0,
    communication: 0,
    entertainment: 0,
    social: 0,
    other: 0,
  };

  if (Array.isArray(categories)) {
    for (const item of categories as Array<{ category?: string; durationSec?: number }>) {
      if (item && item.category) {
        const cat = item.category.toLowerCase();
        normalizedCategories[cat] = (normalizedCategories[cat] || 0) + (Number(item.durationSec) || 0);
      }
    }
  } else if (categories && typeof categories === 'object') {
    for (const [k, v] of Object.entries(categories)) {
      const cat = k.toLowerCase();
      normalizedCategories[cat] = (normalizedCategories[cat] || 0) + (Number(v) || 0);
    }
  }

  const entries = Object.entries(normalizedCategories)
    .filter(([, sec]) => typeof sec === 'number' && !isNaN(sec) && sec > 0)
    .map(([key, sec]) => ({
      key,
      sec,
      percent: Math.round((sec / safeTotal) * 100),
      config: CATEGORY_CONFIG[key] ?? {
        label: key.charAt(0).toUpperCase() + key.slice(1),
        color: '#94a3b8',
        gradient: '#94a3b8',
      },
    }));

  const radius = 70;
  const circumference = 2 * Math.PI * radius;

  let accumulatedOffset = 0;
  const arcs = entries.map((entry) => {
    const strokeLength = Math.min(circumference, (entry.sec / safeTotal) * circumference);
    const strokeDasharray = `${strokeLength} ${Math.max(0, circumference - strokeLength)}`;
    const strokeDashoffset = -accumulatedOffset;
    accumulatedOffset += strokeLength;
    return {
      ...entry,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const productiveSec = normalizedCategories.productive ?? 0;
  const productivePercent = Math.min(100, Math.round((productiveSec / safeTotal) * 100));

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
