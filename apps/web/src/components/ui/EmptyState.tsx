import type { ReactNode } from 'react';
import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  message: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ message, description, action }: EmptyStateProps) {
  return (
    <div className={styles.emptyState}>
      <p className={styles.message}>{message}</p>
      {description ? <p className={styles.description}>{description}</p> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
