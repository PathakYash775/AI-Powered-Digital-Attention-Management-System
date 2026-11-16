import { useState, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import { App as CapApp } from '@capacitor/app';
import { useAuth } from '../features/auth/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { NotificationBell } from '../components/navigation/NotificationBell';
import styles from './AppLayout.module.css';

export function AppLayout() {
  const { logout, user, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const displayName = user?.email?.split('@')[0] || 'User';
  const email = user?.email || 'example@gmail.com';

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  // Auto-close navigation drawer on route change
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [location.pathname]);

  // Lock body scroll while mobile drawer is open
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isDrawerOpen]);

  // Handle Escape key to dismiss drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        setIsDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen]);

  // Android hardware back button integration via Capacitor App plugin
  useEffect(() => {
    let removeListener: (() => void) | undefined;
    try {
      const listenerPromise = CapApp.addListener('backButton', ({ canGoBack }) => {
        if (isDrawerOpen) {
          setIsDrawerOpen(false);
        } else if (location.pathname === '/' || location.pathname === '/dashboard') {
          CapApp.exitApp();
        } else if (canGoBack) {
          window.history.back();
        } else {
          CapApp.exitApp();
        }
      });
      listenerPromise
        .then((handle) => {
          removeListener = () => handle.remove();
        })
        .catch(() => {
          // Running in standard web browser without native bridge
        });
    } catch {
      // Ignore if CapApp is unavailable in unit test / browser environment
    }

    return () => {
      if (removeListener) {
        removeListener();
      }
    };
  }, [isDrawerOpen, location.pathname]);

  // Touch gesture support: swipe right from left edge to open drawer, swipe left to close
  useEffect(() => {
    let touchStartX = 0;
    let touchStartY = 0;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.changedTouches.length !== 1) return;
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const dx = touchEndX - touchStartX;
      const dy = Math.abs(touchEndY - touchStartY);

      // Horizontal gesture dominance
      if (dy < 60) {
        if (!isDrawerOpen && touchStartX < 36 && dx > 48) {
          setIsDrawerOpen(true);
        } else if (isDrawerOpen && dx < -48) {
          setIsDrawerOpen(false);
        }
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDrawerOpen]);

  const getPageTitle = (pathname: string) => {
    switch (pathname) {
      case '/':
      case '/dashboard':
        return 'Activity Dashboard';
      case '/activity':
        return 'Activity Tracking';
      case '/analytics':
        return 'AI Models & Analytics';
      case '/focus':
        return 'Focus Sessions';
      case '/goals':
        return 'Goals & Habits';
      case '/tasks':
        return 'Task Manager';
      case '/recommendations':
        return 'AI Recommendations';
      case '/devices':
        return 'Connected Devices';
      case '/profile':
        return 'Profile & Settings';
      default:
        return 'Digital Attention';
    }
  };

  return (
    <div className={styles.layout}>
      {/* Mobile Drawer Backdrop Overlay */}
      <div
        className={`${styles.drawerBackdrop} ${isDrawerOpen ? styles.backdropOpen : ''}`}
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Sidebar Navigation (Desktop persistent, Mobile left slide drawer) */}
      <aside
        className={`${styles.sidebar} ${isDrawerOpen ? styles.sidebarOpen : ''}`}
        aria-label="Sidebar navigation"
      >
        <div className={styles.brand}>
          <div className={styles.brandLogoIcon}>
            <svg
              width="20"
              height="20"
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
            <span className={styles.brandTitle}>
              Digital <span className={styles.brandSubtitle}>Attention</span>
            </span>
          </div>

          {/* Close button inside mobile slide drawer */}
          <button
            type="button"
            className={styles.drawerCloseBtn}
            onClick={closeDrawer}
            aria-label="Close Navigation Menu"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <nav className={styles.navContainer} aria-label="Main sidebar navigation">
          <div className={styles.navSection}>
            <div className={styles.sectionHeader}>Menu</div>

            {/* 1. Dashboard */}
            <NavLink
              to="/"
              end
              onClick={closeDrawer}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <svg
                className={styles.navIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
              </svg>
              <span>Dashboard</span>
            </NavLink>

            {/* 2. Activity Tracking */}
            <NavLink
              to="/activity"
              onClick={closeDrawer}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <svg
                className={styles.navIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              <span>Activity Tracking</span>
            </NavLink>

            {/* 3. AI Models & Analytics */}
            <NavLink
              to="/analytics"
              onClick={closeDrawer}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <svg
                className={styles.navIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 2a4 4 0 0 1 4 4c0 1.95-1.4 3.58-3.25 3.93L12 22" />
                <path d="M12 2a4 4 0 0 0-4 4c0 1.95 1.4 3.58 3.25 3.93" />
                <path d="M8 8a6 6 0 0 0-4 6c0 3 2 5.5 5 5.92" />
                <path d="M16 8a6 6 0 0 1 4 6c0 3-2 5.5-5 5.92" />
              </svg>
              <span>AI Models &amp; Analytics</span>
            </NavLink>

            {/* 4. Focus Sessions */}
            <NavLink
              to="/focus"
              onClick={closeDrawer}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <svg
                className={styles.navIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>Focus Sessions</span>
            </NavLink>

            {/* 5. Goals & Habits */}
            <NavLink
              to="/goals"
              onClick={closeDrawer}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <svg
                className={styles.navIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" />
              </svg>
              <span>Goals &amp; Habits</span>
            </NavLink>

            {/* 6. Task Manager */}
            <NavLink
              to="/tasks"
              onClick={closeDrawer}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <svg
                className={styles.navIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="9 11 12 14 22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
              </svg>
              <span>Task Manager</span>
            </NavLink>

            {/* 7. AI Recommendations */}
            <NavLink
              to="/recommendations"
              onClick={closeDrawer}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <svg
                className={styles.navIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07l14.14-14.14" />
              </svg>
              <span>Recommendations</span>
            </NavLink>

            {/* 8. Connected Devices */}
            <NavLink
              to="/devices"
              onClick={closeDrawer}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <svg
                className={styles.navIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" />
              </svg>
              <span>Connected Devices</span>
            </NavLink>

            {/* 9. Settings & Profile */}
            <NavLink
              to="/profile"
              onClick={closeDrawer}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <svg
                className={styles.navIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>Settings &amp; Profile</span>
            </NavLink>

            {/* 10. Admin Console (Privileged) */}
            {isAdmin ? (
              <NavLink
                to="/admin"
                onClick={closeDrawer}
                className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
                style={{ color: '#f87171' }}
              >
                <svg
                  className={styles.navIcon}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span>🛡️ Admin Console</span>
              </NavLink>
            ) : null}
          </div>
        </nav>

        {/* User Profile in Sidebar Footer */}
        <div className={styles.sidebarFooter}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>{displayName.slice(0, 2).toUpperCase()}</div>
            <div className={styles.userDetails}>
              <span className={styles.userName}>{displayName}</span>
              <span className={styles.userRole}>{isAdmin ? 'Administrator' : 'User'}</span>
              <span className={styles.userEmail}>{email}</span>
            </div>
          </div>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => {
              closeDrawer();
              logout();
            }}
            title="Sign Out"
            aria-label="Sign Out"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Main Canvas */}
      <div className={styles.mainCanvas}>
        {/* Top Header Bar */}
        <header className={styles.canvasTopBar}>
          {/* Mobile Hamburger Toggle Button */}
          <button
            type="button"
            className={styles.hamburgerBtn}
            onClick={() => setIsDrawerOpen((prev) => !prev)}
            aria-label={isDrawerOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
            aria-expanded={isDrawerOpen}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {/* Mobile Brand (visible only on mobile) */}
          <div className={styles.mobileBrand}>
            <div className={styles.mobileLogo}>
              <svg
                width="16"
                height="16"
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
            <div className={styles.mobileBrandTextGroup}>
              <span className={styles.mobileTitle}>
                Digital <span className={styles.mobileTitleHighlight}>Attention</span>
              </span>
              <span className={styles.mobileTrackingPill}>
                <span className={styles.mobilePulseDot} />
                <span>Tracking Active</span>
              </span>
            </div>
          </div>

          {/* Desktop Breadcrumb/Status (visible only on desktop) */}
          <div className={styles.desktopHeaderLeft}>
            <span className={styles.pageBreadcrumb}>{getPageTitle(location.pathname)}</span>
            <span className={styles.liveStoreIndicator}>
              <span className={styles.indicatorPulse} />
              <span>PostgreSQL Telemetry · Active</span>
            </span>
          </div>

          {/* Action buttons (responsive on desktop & mobile) */}
          <div className={styles.headerActions}>
            {isAdmin ? (
              <Link
                to="/admin"
                className={styles.adminConsoleBtn}
                title="Admin Console"
              >
                <span>🛡️</span>
                <span className={styles.btnLabel}>Admin Console</span>
              </Link>
            ) : null}

            <NotificationBell />

            <div className={styles.topUserBadge}>
              <div className={styles.userBadgeAvatar}>{displayName.slice(0, 2).toUpperCase()}</div>
              <span className={styles.userBadgeName}>{displayName}</span>
            </div>

            {/* Theme Toggle Button (Light / Dark) */}
            <button
              type="button"
              className={styles.themeToggleBtn}
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <>
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                  <span className={styles.btnLabel}>Light</span>
                </>
              ) : (
                <>
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                  <span className={styles.btnLabel}>Dark</span>
                </>
              )}
            </button>

            <button
              type="button"
              className={styles.topRefreshBtn}
              onClick={() => window.location.reload()}
              title="Refresh screen"
              aria-label="Refresh Screen"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              <span className={styles.btnLabel}>Refresh</span>
            </button>
            <button
              type="button"
              className={styles.topSignOutBtn}
              onClick={() => logout()}
              title="Sign Out"
              aria-label="Sign Out"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span className={styles.btnLabel}>Sign Out</span>
            </button>
          </div>
        </header>

        {/* Scrollable Page Content */}
        <main className={styles.contentWrapper}>
          <ErrorBoundary fallbackTitle="View Rendering Error">
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
