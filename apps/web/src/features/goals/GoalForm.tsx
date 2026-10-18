import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { goalSchema, type GoalFormValues } from './schemas';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import type { Goal } from '../../api/types';
import styles from './GoalForm.module.css';

export interface GoalFormProps {
  initialGoal?: Goal;
  onSubmit: (values: GoalFormValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function GoalForm({ initialGoal, onSubmit, onCancel, isSubmitting = false }: GoalFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      type: initialGoal?.type ?? 'focus_minutes',
      period: initialGoal?.period ?? 'daily',
      targetValue: initialGoal?.targetValue ?? 60,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
      <Field id="goal-type" label="Goal Type" error={errors.type?.message}>
        <select
          id="goal-type"
          aria-describedby={errors.type ? 'goal-type-error' : undefined}
          {...register('type')}
        >
          <option value="focus_minutes">Focus minutes</option>
          <option value="max_screen_minutes">Max screen minutes</option>
          <option value="max_context_switches">Max context switches</option>
        </select>
      </Field>

      <Field id="goal-period" label="Period" error={errors.period?.message}>
        <select
          id="goal-period"
          aria-describedby={errors.period ? 'goal-period-error' : undefined}
          {...register('period')}
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
        </select>
      </Field>

      <Field
        id="goal-targetValue"
        label="Target Value (1 - 10080)"
        error={errors.targetValue?.message}
      >
        <input
          id="goal-targetValue"
          type="number"
          min={1}
          max={10080}
          aria-describedby={errors.targetValue ? 'goal-targetValue-error' : undefined}
          {...register('targetValue')}
        />
      </Field>

      <div className={styles.actions}>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : initialGoal ? 'Update Goal' : 'Create Goal'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
