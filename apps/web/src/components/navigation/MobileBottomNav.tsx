import { NavLink } from 'react-router-dom';
import styles from './MobileBottomNav.module.css';

export function MobileBottomNav() {
  return (
    <nav className={styles.bottomBar} aria-label="Mobile Bottom Navigation">
      {/* 1. Home / Dashboard */}
      <NavLink
        to="/"
        end
        className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
        aria-label="Home Dashboard"
      >
        <div className={styles.iconWrapper}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <span className={styles.navLabel}>Home</span>
      </NavLink>

      {/* 2. Analytics */}
      <NavLink
        to="/analytics"
        className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
        aria-label="Focus Analytics"
      >
        <div className={styles.iconWrapper}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        </div>
        <span className={styles.navLabel}>Analytics</span>
      </NavLink>

      {/* 3. Devices */}
      <NavLink
        to="/devices"
        className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
        aria-label="Connected Devices"
      >
        <div className={styles.iconWrapper}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        </div>
        <span className={styles.navLabel}>Devices</span>
      </NavLink>

      {/* 4. Profile */}
      <NavLink
        to="/profile"
        className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
        aria-label="Profile and Settings"
      >
        <div className={styles.iconWrapper}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <span className={styles.navLabel}>Profile</span>
      </NavLink>
    </nav>
  );
}
