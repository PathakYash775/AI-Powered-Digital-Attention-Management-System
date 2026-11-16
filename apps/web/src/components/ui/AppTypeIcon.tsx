import styles from './AppTypeIcon.module.css';

interface AppTypeIconProps {
  name?: string | null;
  domain?: string | null;
  category?: string | null;
  size?: number;
}

export function AppTypeIcon({ name, domain, category, size = 14 }: AppTypeIconProps) {
  const text = `${name || ''} ${domain || ''}`.toLowerCase();
  const cat = (category || '').toLowerCase();

  // 1. Code / Development (code icon: </>)
  const isCode =
    text.includes('code') ||
    text.includes('cursor') ||
    text.includes('terminal') ||
    text.includes('antigravity') ||
    text.includes('powershell') ||
    text.includes('cmd') ||
    text.includes('git') ||
    text.includes('python') ||
    text.includes('node') ||
    text.includes('studio') ||
    text.includes('idea') ||
    text.includes('pycharm') ||
    text.includes('sublime') ||
    text.includes('vim') ||
    text.includes('neovim') ||
    text.includes('stackoverflow') ||
    text.includes('leetcode') ||
    cat === 'productive';

  // 2. Chat / Communication (speech bubble icon)
  const isChat =
    text.includes('slack') ||
    text.includes('discord') ||
    text.includes('whatsapp') ||
    text.includes('teams') ||
    text.includes('telegram') ||
    text.includes('mail') ||
    text.includes('outlook') ||
    text.includes('gmail') ||
    text.includes('zoom') ||
    cat === 'communication' ||
    cat === 'social';

  // 3. Web Domain / Browser (globe icon)
  const isWeb =
    Boolean(domain) ||
    text.includes('.com') ||
    text.includes('.org') ||
    text.includes('.net') ||
    text.includes('.ai') ||
    text.includes('.io') ||
    text.includes('chrome') ||
    text.includes('firefox') ||
    text.includes('edge') ||
    text.includes('browser') ||
    text.includes('safari');

  if (isCode && !isChat) {
    return (
      <div className={`${styles.iconBox} ${styles.iconCode}`} title="Development / IDE">
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" className={styles.iconSvg}>
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      </div>
    );
  }

  if (isChat) {
    return (
      <div className={`${styles.iconBox} ${styles.iconChat}`} title="Communication / Social">
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" className={styles.iconSvg}>
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      </div>
    );
  }

  if (isWeb) {
    return (
      <div className={`${styles.iconBox} ${styles.iconWeb}`} title="Web Browser / Domain">
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" className={styles.iconSvg}>
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      </div>
    );
  }

  // 4. Default: Folder / Desktop app window
  return (
    <div className={`${styles.iconBox} ${styles.iconFolder}`} title="Application / Utility">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" className={styles.iconSvg}>
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    </div>
  );
}

