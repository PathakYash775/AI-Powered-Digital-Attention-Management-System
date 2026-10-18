import type { ReactNode } from 'react';
import styles from './Field.module.css';

export interface FieldProps {
  id: string;
  label: ReactNode;
  action?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}

export function Field({ id, label, action, error, children, className = '' }: FieldProps) {
  return (
    <div className={`${styles.field} ${className}`.trim()}>
      <div className={styles.labelRow}>
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
        {action ? <div className={styles.action}>{action}</div> : null}
      </div>
      <div className={styles.inputWrapper}>{children}</div>
      {error ? (
        <span id={`${id}-error`} role="alert" className={styles.error}>
          {error}
        </span>
      ) : null}
    </div>
  );
}
