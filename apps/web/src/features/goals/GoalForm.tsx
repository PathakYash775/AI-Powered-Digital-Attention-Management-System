import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { goalSchema, type GoalFormValues } from './schemas';
import type { Goal, GoalType, GoalPeriod } from '../../api/types';
import styles from './GoalForm.module.css';

export interface GoalFormProps {
  initialGoal?: Goal;
  onSubmit: (values: GoalFormValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const GOAL_TYPES: Array<{
  type: GoalType;
  title: string;
  subtitle: string;
  icon: string;
  defaultVal: number;
  unit: string;
  presets: number[];
}> = [
  {
    type: 'focus_minutes',
    title: 'Focus Minutes Target',
    subtitle: 'Daily minimum dedicated to core deep work blocks.',
    icon: '⚡',
    defaultVal: 60,
    unit: 'min',
    presets: [30, 60, 90, 120, 240],
  },
  {
    type: 'max_screen_minutes',
    title: 'Screen Time Cap',
    subtitle: 'Maximum digital screen exposure threshold.',
    icon: '🛡️',
    defaultVal: 480,
    unit: 'min',
    presets: [240, 360, 480, 600],
  },
  {
    type: 'max_context_switches',
    title: 'Context Switch Limit',
    subtitle: 'Minimize rapid multitasking and app-hopping fatigue.',
    icon: '🔀',
    defaultVal: 30,
    unit: 'switches',
    presets: [15, 30, 50, 75],
  },
  {
    type: 'custom',
    title: 'Custom Habit / Skill',
    subtitle: 'DSA practice, LeetCode, reading, or specific study.',
    icon: '🎯',
    defaultVal: 45,
    unit: 'min',
    presets: [25, 45, 60, 90],
  },
];

export function GoalForm({
  initialGoal,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: GoalFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      type: initialGoal?.type ?? 'focus_minutes',
      customName: initialGoal?.customName ?? '',
      period: initialGoal?.period ?? 'daily',
      targetValue: initialGoal?.targetValue ?? 60,
    },
  });

  const selectedType = watch('type');
  const selectedPeriod = watch('period');
  const currentConfig = GOAL_TYPES.find((t) => t.type === selectedType) ?? GOAL_TYPES[0];

  const handleSelectType = (t: GoalType) => {
    setValue('type', t);
    const cfg = GOAL_TYPES.find((c) => c.type === t);
    if (cfg && !initialGoal) {
      setValue('targetValue', cfg.defaultVal);
    }
  };

  const handleSelectPeriod = (p: GoalPeriod) => {
    setValue('period', p);
  };

  const handleSelectPreset = (val: number) => {
    setValue('targetValue', val);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.formContainer} noValidate>
      {/* 1. Goal Type Cards Selector */}
      <div className={styles.fieldGroup}>
        <span className={styles.fieldLabel}>
          <span>Select Goal Category</span>
          <span className={styles.fieldHelper}>Defines telemetry tracking logic</span>
        </span>

        <div className={styles.typeCardsGrid} role="radiogroup" aria-label="Goal category selection">
          {GOAL_TYPES.map((t) => {
            const isActive = selectedType === t.type;
            return (
              <button
                key={t.type}
                type="button"
                className={`${styles.typeCard} ${isActive ? styles.activeTypeCard : ''}`}
                onClick={() => handleSelectType(t.type)}
                role="radio"
                aria-checked={isActive}
              >
                <div className={styles.typeIcon}>{t.icon}</div>
                <div className={styles.typeText}>
                  <span className={styles.typeTitle}>{t.title}</span>
                  <span className={styles.typeSubtitle}>{t.subtitle}</span>
                </div>
              </button>
            );
          })}
        </div>
        {errors.type && <span className={styles.errorText}>{errors.type.message}</span>}
      </div>

      {/* Optional: Custom Goal Name */}
      {selectedType === 'custom' && (
        <div className={styles.fieldGroup}>
          <label htmlFor="goal-customName" className={styles.fieldLabel}>
            Custom Goal / Habit Name
          </label>
          <div className={styles.inputWrapper}>
            <input
              id="goal-customName"
              type="text"
              placeholder="e.g. DSA Problem Solving, LeetCode, Reading Research"
              className={styles.styledInput}
              {...register('customName')}
            />
          </div>
          {errors.customName && <span className={styles.errorText}>{errors.customName.message}</span>}
        </div>
      )}

      {/* 2. Grid: Period (Daily / Weekly) and Target Value */}
      <div className={styles.rowGrid}>
        {/* Period Segmented Toggle */}
        <div className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>Frequency &amp; Time Horizon</span>
          <div className={styles.segmentedControl} role="group" aria-label="Goal frequency">
            <button
              type="button"
              className={`${styles.segmentBtn} ${selectedPeriod === 'daily' ? styles.activeSegment : ''}`}
              onClick={() => handleSelectPeriod('daily')}
            >
              <span>☀️ Daily Target</span>
            </button>
            <button
              type="button"
              className={`${styles.segmentBtn} ${selectedPeriod === 'weekly' ? styles.activeSegment : ''}`}
              onClick={() => handleSelectPeriod('weekly')}
            >
              <span>📅 Weekly Target</span>
            </button>
          </div>
        </div>

        {/* Target Value Input with presets */}
        <div className={styles.fieldGroup}>
          <label htmlFor="goal-targetValue" className={styles.fieldLabel}>
            <span>Target Value (Threshold)</span>
            <span className={styles.fieldHelper}>
              {selectedPeriod === 'daily' ? 'Per day target' : '7-day accumulated target'}
            </span>
          </label>

          <div className={styles.inputWrapper}>
            <input
              id="goal-targetValue"
              type="number"
              min={1}
              max={10080}
              className={styles.styledInput}
              {...register('targetValue', { valueAsNumber: true })}
            />
            <span className={styles.inputAddon}>
              {currentConfig.unit} / {selectedPeriod}
            </span>
          </div>
          {errors.targetValue && <span className={styles.errorText}>{errors.targetValue.message}</span>}

          {/* Quick preset chips */}
          <div className={styles.presetChipsRow}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #64748b)' }}>Presets:</span>
            {currentConfig.presets.map((val) => (
              <button
                key={val}
                type="button"
                className={styles.presetChip}
                onClick={() => handleSelectPreset(val)}
              >
                {val} {currentConfig.unit}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Action Buttons */}
      <div className={styles.actionsRow}>
        <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
          {isSubmitting ? (
            'Saving Goal...'
          ) : (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{initialGoal ? 'Update Goal' : 'Create Goal'}</span>
            </>
          )}
        </button>

        <button type="button" className={styles.cancelBtn} onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </button>
      </div>
    </form>
  );
}
