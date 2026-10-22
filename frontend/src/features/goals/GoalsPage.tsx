import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { goalsApi } from '../../api/goals';
import type { Goal } from '../../api/types';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { GoalForm } from './GoalForm';
import type { GoalFormValues } from './schemas';
import styles from './GoalsPage.module.css';

const GOAL_LIMIT = 20;

export function GoalsPage() {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [deletingGoal, setDeletingGoal] = useState<Goal | null>(null);
  const deleteDialogRef = useRef<HTMLDialogElement>(null);

  const {
    data: goals = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['goals'],
    queryFn: goalsApi.getGoals,
  });

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

  const formatGoalType = (goal: Goal) => {
    if (goal.type === 'custom') {
      return goal.customName || 'Custom Goal';
    }
    switch (goal.type) {
      case 'focus_minutes':
        return 'Focus Minutes';
      case 'max_screen_minutes':
        return 'Max Screen Minutes';
      case 'max_context_switches':
        return 'Max Context Switches';
      default:
        return 'Custom Goal';
    }
  };

  if (isLoading) {
    return <Spinner label="Loading goals..." />;
  }

  if (isError) {
    return (
      <div role="alert" className={styles.errorAlert}>
        Failed to load goals. Please refresh.
      </div>
    );
  }

  const reachedLimit = goals.length >= GOAL_LIMIT;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Goals</h1>
          <p className={styles.countText}>
            {goals.length} of {GOAL_LIMIT} goals configured
          </p>
        </div>
        {!isCreating && !editingGoal ? (
          <Button onClick={() => setIsCreating(true)} disabled={reachedLimit}>
            Add Goal
          </Button>
        ) : null}
      </header>

      {reachedLimit ? (
        <div role="status" className={styles.limitWarning}>
          Maximum limit of {GOAL_LIMIT} goals reached. Delete an existing goal to create a new one.
        </div>
      ) : null}

      {isCreating ? (
        <section aria-label="Create new goal">
          <h2 className={styles.sectionTitle}>Add New Goal</h2>
          <GoalForm
            onSubmit={(vals) => createMutation.mutate(vals)}
            onCancel={() => setIsCreating(false)}
            isSubmitting={createMutation.isPending}
          />
        </section>
      ) : null}

      {editingGoal ? (
        <section aria-label="Edit goal">
          <h2 className={styles.sectionTitle}>Edit Goal</h2>
          <GoalForm
            initialGoal={editingGoal}
            onSubmit={(vals) => updateMutation.mutate({ id: editingGoal.id, values: vals })}
            onCancel={() => setEditingGoal(null)}
            isSubmitting={updateMutation.isPending}
          />
        </section>
      ) : null}

      {goals.length === 0 ? (
        <EmptyState
          message="No goals configured yet"
          description="Create a goal to monitor your screen time and task switching limits."
          action={<Button onClick={() => setIsCreating(true)}>Add your first goal</Button>}
        />
      ) : (
        <ul className={styles.list} aria-label="Goals list">
          {goals.map((g) => (
            <li key={g.id} className={styles.goalCard}>
              <div className={styles.goalInfo}>
                <span className={styles.goalType}>{formatGoalType(g)}</span>
                <span className={styles.goalTarget}>
                  Target: {g.targetValue} ({g.period})
                </span>
              </div>
              <div className={styles.cardActions}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingGoal(g);
                  }}
                >
                  Edit
                </Button>
                <Button variant="danger" onClick={() => openDeleteDialog(g)}>
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <dialog ref={deleteDialogRef} className={styles.dialog} onCancel={closeDeleteDialog}>
        <div className={styles.dialogContent}>
          <h2 className={styles.dialogTitle}>Delete Goal</h2>
          <p className={styles.dialogBody}>
            Are you sure you want to delete this {deletingGoal?.period}{' '}
            {deletingGoal ? formatGoalType(deletingGoal) : 'goal'}? This action cannot be
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
