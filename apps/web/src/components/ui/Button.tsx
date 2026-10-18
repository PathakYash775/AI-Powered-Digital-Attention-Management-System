import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  children,
  className = '',
  type = 'button',
  disabled = false,
  ...rest
}: ButtonProps) {
  const variantClass = styles[variant] || styles.primary;
  return (
    <button
      type={type}
      disabled={disabled}
      className={`${styles.button} ${variantClass} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}
