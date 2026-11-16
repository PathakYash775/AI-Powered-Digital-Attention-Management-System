import { DevicePairingSection } from './DevicePairingSection';
import styles from './DevicesPage.module.css';

export function DevicesPage() {
  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <div className={styles.headerIconBox}>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        </div>
        <div>
          <h1 className={styles.pageTitle}>Connected Devices</h1>
          <p className={styles.pageSubtitle}>
            Manage your companion Chrome Extension and Windows Desktop Tracker.
          </p>
        </div>
      </header>

      <DevicePairingSection />
    </div>
  );
}

