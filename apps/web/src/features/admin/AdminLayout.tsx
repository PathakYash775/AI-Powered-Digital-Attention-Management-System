import { useState, useEffect, useCallback } from 'react';
import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { App as CapApp } from '@capacitor/app';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import styles from './AdminLayout.module.css';

export function AdminLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  // Auto-close on navigation
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

  // Android hardware back button integration
  useEffect(() => {
    let removeListener: (() => void) | undefined;
    try {
      const listenerPromise = CapApp.addListener('backButton', ({ canGoBack }) => {
        if (isDrawerOpen) {
          setIsDrawerOpen(false);
        } else if (canGoBack) {
          window.history.back();
        } else {
          navigate('/');
        }
      });
      listenerPromise
        .then((handle) => {
          removeListener = () => handle.remove();
        })
        .catch(() => {});
    } catch {}

    return () => {
      if (removeListener) removeListener();
    };
  }, [isDrawerOpen, navigate]);

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

  const handleSignOut = async () => {
    await logout();
    navigate('/login?role=admin');
  };

  const navItems = [
    {
      to: '/admin',
      label: 'System Overview',
      end: true,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="7" height="9" x="3" y="3" rx="1" />
          <rect width="7" height="5" x="14" y="3" rx="1" />
          <rect width="7" height="9" x="14" y="12" rx="1" />
          <rect width="7" height="5" x="3" y="16" rx="1" />
        </svg>
      ),
    },
    {
      to: '/admin/users',
      label: 'User Management',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      to: '/admin/categories',
      label: 'Classification Rules',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
          <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
          <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
        </svg>
      ),
    },
  ];

  return (
    <div className={styles.layout}>
      {/* Mobile Drawer Backdrop Overlay */}
      <div
        className={`${styles.drawerBackdrop} ${isDrawerOpen ? styles.backdropOpen : ''}`}
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Sidebar Navigation (Desktop persistent, Mobile left slide drawer) */}
      <aside className={`${styles.sidebar} ${isDrawerOpen ? styles.sidebarOpen : ''}`} aria-label="Admin Navigation">
        <div className={styles.brand}>
          <div className={styles.brandLogoIcon}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div className={styles.brandText}>
            <div className={styles.brandTitle}>
              Admin Portal <span className={styles.adminBadge}>RBAC</span>
            </div>
            <span className={styles.brandSubtitle}>System Governance</span>
          </div>

          {/* Close button for mobile drawer */}
          <button
            type="button"
            className={styles.drawerCloseBtn}
            onClick={closeDrawer}
            aria-label="Close Admin Navigation Menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <nav className={styles.navContainer}>
          <div className={styles.navSectionTitle}>Administration</div>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={closeDrawer}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
              }
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <Link to="/" onClick={closeDrawer} className={styles.returnUserBtn}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span>Return to User Dashboard</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={styles.mainWrapper}>
        <header className={styles.topbar}>
          {/* Mobile Hamburger Toggle */}
          <button
            type="button"
            className={styles.hamburgerBtn}
            onClick={() => setIsDrawerOpen((prev) => !prev)}
            aria-label={isDrawerOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
            aria-expanded={isDrawerOpen}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <div className={styles.topbarLeft}>
            <h1 className={styles.topbarTitle}>Platform Governance</h1>
            <div className={styles.topbarStatusPill}>
              <span className={styles.statusDot} />
              <span>Admin Active</span>
            </div>
          </div>

          <div className={styles.topbarRight}>
            <button
              type="button"
              className={styles.themeToggleBtn}
              onClick={toggleTheme}
              aria-label="Toggle visual theme"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            <div className={styles.adminProfilePill}>
              <div className={styles.adminAvatar}>
                {user?.email?.charAt(0).toUpperCase() || 'A'}
              </div>
              <span className={styles.adminEmail}>{user?.email || 'admin'}</span>
            </div>

            <button
              type="button"
              className={styles.signOutBtn}
              onClick={handleSignOut}
              aria-label="Sign out of administrator session"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span className={styles.signOutLabel}>Sign Out</span>
            </button>
          </div>
        </header>

        <main className={styles.pageBody}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
