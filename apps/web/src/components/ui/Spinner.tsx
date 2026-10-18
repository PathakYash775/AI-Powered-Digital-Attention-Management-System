import styles from './Spinner.module.css';

export interface SpinnerProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ label = 'Loading...', size = 'md', className = '' }: SpinnerProps) {
  const sizeClass = styles[size] || styles.md;
  return (
    <div role="status" className={`${styles.container} ${className}`.trim()} aria-live="polite">
      <div className={`${styles.spinner} ${sizeClass}`} />
      <span className={styles.srOnly}>{label}</span>
    </div>
  );
}
