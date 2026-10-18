import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { useAuth } from './AuthContext';
import { registerSchema, type RegisterFormValues } from './schemas';
import type { ApiErrorResponse } from '../../api/types';
import styles from './RegisterPage.module.css';

export function RegisterPage() {
  const { isAuthenticated, register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      displayName: '',
    },
  });

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (data: RegisterFormValues) => {
    setServerError(null);
    try {
      await registerUser({
        email: data.email.trim().toLowerCase(),
        password: data.password,
        displayName: data.displayName.trim(),
      });
      navigate('/', { replace: true });
    } catch (err: unknown) {
      if (isAxiosError<ApiErrorResponse>(err) && err.response?.data?.error) {
        const error = err.response.data.error;
        if (error.code === 'RATE_LIMITED') {
          setServerError('Too many attempts. Try again in a minute.');
          return;
        }
        setServerError(error.message);
        return;
      }
      setServerError('Registration failed. Please try again.');
    }
  };

  return (
    <main className={styles.pageWrapper}>
      <div className={styles.backdropOverlay} aria-hidden="true" />
      <div className={styles.card}>
        {/* =========================================
            LEFT COLUMN: HERO SECTION
        ========================================= */}
        <section className={styles.heroPanel}>
          <div className={styles.heroOverlay} aria-hidden="true" />

          {/* Sticky Notes Corkboard Widget */}
          <div className={styles.stickyNotesWidget} aria-hidden="true">
            <div className={styles.stickyItem}>
              <span>Plan</span>
              <span>✓</span>
            </div>
            <div className={styles.stickyItem}>
              <span>Focus</span>
              <span>✓</span>
            </div>
            <div className={styles.stickyItem}>
              <span>Grow</span>
              <span>✓</span>
            </div>
          </div>

          <div className={styles.heroContent}>
            <div>
              <div className={styles.brandRow}>
                <div className={styles.brandLogo} aria-hidden="true">
                  <svg
                    width="26"
                    height="26"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="6" />
                    <circle cx="12" cy="12" r="2" />
                  </svg>
                </div>
                <div className={styles.brandText}>
                  <span className={styles.brandTitle}>Digital Attention</span>
                  <span className={styles.brandSubtitle}>Management</span>
                  <span className={styles.brandTagline}>Track · Understand · Improve</span>
                </div>
              </div>

              <div className={styles.heroTitleBlock}>
                <h2 className={styles.heroHeadline}>
                  Start Today<br />
                  <span className={styles.heroHeadlineFocus}>Big Results</span>
                </h2>
                <p className={styles.heroDesc}>
                  Join thousands of engineers and professionals taking control of their digital focus
                  and productive hours.
                </p>
              </div>

              <div className={styles.featureList}>
                <div className={styles.featureItem}>
                  <div className={`${styles.featureIconWrap} ${styles.featureIconBlue}`} aria-hidden="true">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 20v-6" />
                      <path d="M6 20V10" />
                      <path d="M18 20V4" />
                    </svg>
                  </div>
                  <div className={styles.featureText}>
                    <span className={styles.featureName}>Track Activity</span>
                    <span className={styles.featureSub}>Monitor your digital habits</span>
                  </div>
                </div>

                <div className={styles.featureItem}>
                  <div className={`${styles.featureIconWrap} ${styles.featureIconGreen}`} aria-hidden="true">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  <div className={styles.featureText}>
                    <span className={styles.featureName}>Understand Patterns</span>
                    <span className={styles.featureSub}>Identify distractions</span>
                  </div>
                </div>

                <div className={styles.featureItem}>
                  <div className={`${styles.featureIconWrap} ${styles.featureIconPurple}`} aria-hidden="true">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="m4.93 4.93 4.24 4.24" />
                      <path d="m14.83 9.17 4.24-4.24" />
                      <path d="m14.83 14.83 4.24 4.24" />
                      <path d="m9.17 14.83-4.24 4.24" />
                      <circle cx="12" cy="12" r="2" />
                    </svg>
                  </div>
                  <div className={styles.featureText}>
                    <span className={styles.featureName}>Improve Focus</span>
                    <span className={styles.featureSub}>Build better habits</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.quoteBlock}>
              &ldquo;Less distraction.<br />
              &nbsp;&nbsp;More progress.&rdquo;
            </div>
          </div>
        </section>

        {/* =========================================
            RIGHT COLUMN: SIGN UP FORM
        ========================================= */}
        <section className={styles.formPanel}>
          <div className={styles.pillBadgeRow}>
            <span className={styles.welcomePill}>
              <span role="img" aria-label="sparkles">✨</span> Get Started Free
            </span>
          </div>

          <div className={styles.formHeader}>
            <h1 className={styles.title}>Create your account</h1>
            <p className={styles.subtitle}>
              Start tracking focus sessions and digital habits effortlessly
            </p>
          </div>

          {serverError ? (
            <div role="alert" className={styles.errorAlert}>
              <svg
                className={styles.errorIcon}
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{serverError}</span>
            </div>
          ) : null}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className={styles.formGroup}>
              <label htmlFor="register-name" className={styles.label}>
                Full Name
              </label>
              <div className={styles.inputWrapper}>
                <span className={styles.inputIcon} aria-hidden="true">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <input
                  id="register-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Yash Pathak"
                  className={`${styles.input} ${errors.displayName ? styles.inputError : ''}`}
                  aria-describedby={errors.displayName ? 'register-name-error' : undefined}
                  {...register('displayName')}
                />
              </div>
              {errors.displayName ? (
                <span id="register-name-error" role="alert" className={styles.fieldError}>
                  {errors.displayName.message}
                </span>
              ) : null}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="register-email" className={styles.label}>
                Email
              </label>
              <div className={styles.inputWrapper}>
                <span className={styles.inputIcon} aria-hidden="true">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </span>
                <input
                  id="register-email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                  aria-describedby={errors.email ? 'register-email-error' : undefined}
                  {...register('email')}
                />
              </div>
              {errors.email ? (
                <span id="register-email-error" role="alert" className={styles.fieldError}>
                  {errors.email.message}
                </span>
              ) : null}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="register-password" className={styles.label}>
                Password
              </label>
              <div className={styles.inputWrapper}>
                <span className={styles.inputIcon} aria-hidden="true">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="At least 10 characters"
                  className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                  aria-describedby={errors.password ? 'register-password-error' : undefined}
                  {...register('password')}
                />
                <button
                  type="button"
                  className={styles.togglePasswordBtn}
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide text' : 'Show text'}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" x2="22" y1="2" y2="22" />
                    </svg>
                  ) : (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password ? (
                <span id="register-password-error" role="alert" className={styles.fieldError}>
                  {errors.password.message}
                </span>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={styles.submitBtn}
              aria-label={isSubmitting ? 'Registering...' : 'Register'}
            >
              {isSubmitting ? (
                'Registering...'
              ) : (
                <>
                  Register <span aria-hidden="true">→</span>
                </>
              )}
            </button>
          </form>

          <div className={styles.dividerRow}>
            <span className={styles.dividerText}>OR</span>
          </div>

          <p className={styles.footerText}>
            Already have an account?{' '}
            <Link to="/login" className={styles.footerLink}>
              Log in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
