import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  isRoot?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught component error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: this.props.isRoot ? '100vh' : '70vh',
            width: '100%',
            padding: '2rem',
            boxSizing: 'border-box',
            backgroundColor: this.props.isRoot ? '#0b1120' : 'transparent',
          }}
        >
          <div
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '16px',
              padding: '2.5rem 2rem',
              maxWidth: '500px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1rem', lineHeight: 1 }}>
              🔄
            </div>
            <h2
              style={{
                fontSize: '1.375rem',
                fontWeight: 700,
                color: '#f8fafc',
                margin: '0 0 0.75rem 0',
              }}
            >
              {this.props.fallbackTitle || 'Attention Management System'}
            </h2>
            <p
              style={{
                fontSize: '0.875rem',
                color: '#94a3b8',
                lineHeight: 1.6,
                margin: '0 0 1.5rem 0',
              }}
            >
              The screen went blank or encountered an unexpected rendering issue. Click the button below to instantly refresh and restore your view.
            </p>
            {this.state.error && (
              <div
                style={{
                  marginBottom: '1.25rem',
                  padding: '0.75rem',
                  backgroundColor: '#0f172a',
                  border: '1px solid #ef4444',
                  borderRadius: '8px',
                  color: '#fca5a5',
                  fontSize: '0.75rem',
                  textAlign: 'left',
                  maxHeight: '140px',
                  overflowY: 'auto',
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap',
                }}
              >
                <strong>Error: </strong>
                {this.state.error.message || String(this.state.error)}
              </div>
            )}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                alignItems: 'center',
              }}
            >
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  background: 'var(--color-primary)',
                  color: 'var(--color-primary-contrast)',
                  border: 'none',
                  padding: '0.875rem 2rem',
                  borderRadius: '8px',
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 14px var(--color-primary-glow)',
                  transition: 'transform 0.15s ease',
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
                <span>Refresh Screen</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem('atn_access_token');
                    localStorage.removeItem('atn_refresh_token');
                    localStorage.removeItem('atn_auth_user');
                  } catch {}
                  window.location.href = '/login';
                }}
                style={{
                  background: 'rgba(56, 189, 248, 0.1)',
                  color: '#38bdf8',
                  border: '1px solid #0284c7',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                Go to Login Page
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  background: 'transparent',
                  color: '#94a3b8',
                  border: '1px solid #475569',
                  padding: '0.625rem 1.5rem',
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                Try Again Without Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
