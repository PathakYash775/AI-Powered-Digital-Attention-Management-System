const hourFormatter = new Intl.NumberFormat('en-US', {
  style: 'unit',
  unit: 'hour',
  unitDisplay: 'short',
});

const minuteFormatter = new Intl.NumberFormat('en-US', {
  style: 'unit',
  unit: 'minute',
  unitDisplay: 'short',
});

const secondFormatter = new Intl.NumberFormat('en-US', {
  style: 'unit',
  unit: 'second',
  unitDisplay: 'short',
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const numberFormatter = new Intl.NumberFormat('en-US');

export function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0 min';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0 && minutes > 0) {
    return `${hourFormatter.format(hours)} ${minuteFormatter.format(minutes)}`;
  }
  if (hours > 0) {
    return hourFormatter.format(hours);
  }
  if (minutes > 0) {
    return minuteFormatter.format(minutes);
  }
  return secondFormatter.format(remainingSeconds);
}

export function formatDateTime(isoString: string): string {
  return dateTimeFormatter.format(new Date(isoString));
}

export function formatNumber(val: number): string {
  return numberFormatter.format(val);
}

export function getTodayDateString(): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

const DOMAIN_APP_NAMES: Record<string, string> = {
  localhost: 'Digital Attention Management',
  '127.0.0.1': 'Digital Attention API Server',
  'github.com': 'GitHub',
  'claude.ai': 'Claude AI',
  'chatgpt.com': 'ChatGPT',
  'openai.com': 'ChatGPT',
  'slack.com': 'Slack',
  'youtube.com': 'YouTube',
  'linkedin.com': 'LinkedIn',
  'notion.so': 'Notion',
  'takeuforward.org': 'TakeUForward',
  'stackoverflow.com': 'Stack Overflow',
  'discord.com': 'Discord',
  'figma.com': 'Figma',
  'linear.app': 'Linear',
  'twitter.com': 'X (Twitter)',
  'x.com': 'X (Twitter)',
  'reddit.com': 'Reddit',
  'spotify.com': 'Spotify',
  'netflix.com': 'Netflix',
  'google.com': 'Google Search',
  'mail.google.com': 'Gmail',
  'meet.google.com': 'Google Meet',
  'calendar.google.com': 'Google Calendar',
  'drive.google.com': 'Google Drive',
  'docs.google.com': 'Google Docs',
  'teams.microsoft.com': 'Microsoft Teams',
  'zoom.us': 'Zoom',
  'gitlab.com': 'GitLab',
  'bitbucket.org': 'Bitbucket',
  'leetcode.com': 'LeetCode',
  'codechef.com': 'CodeChef',
  'codeforces.com': 'Codeforces',
  'medium.com': 'Medium',
  'dev.to': 'DEV Community',
  'amazon.com': 'Amazon',
  'amazon.in': 'Amazon',
  'whatsapp.com': 'WhatsApp',
  'web.whatsapp.com': 'WhatsApp Web',
  whatsapp: 'WhatsApp',
  'telegram.org': 'Telegram',
  'web.telegram.org': 'Telegram Web',
  telegram: 'Telegram',
  'gemini.google.com': 'Google Gemini',
  vscode: 'Visual Studio Code',
  'vs code': 'Visual Studio Code',
  code: 'Visual Studio Code',
  cursor: 'Cursor',
  windowsterminal: 'Windows Terminal',
  notepad: 'Notepad',
  winword: 'Microsoft Word',
  excel: 'Microsoft Excel',
  powerpnt: 'Microsoft PowerPoint',
  teams: 'Microsoft Teams',
  'ms-teams': 'Microsoft Teams',
  slack: 'Slack',
  spotify: 'Spotify',
  vlc: 'VLC Media Player',
  steam: 'Steam',
  discord: 'Discord',
  outlook: 'Microsoft Outlook',
  figma: 'Figma',
  'google chrome': 'Google Chrome',
  chrome: 'Google Chrome',
};

export function formatAppName(input?: string | null): string {
  if (!input) return 'Unknown Application';
  let clean = input.trim();
  if (!clean) return 'Unknown Application';

  // If input contains parenthetical details (e.g. "GitHub (Release v1.0.0 created successfully)")
  const parenMatch = clean.match(/^([^(]+)\s*\((.+)\)$/);
  if (parenMatch) {
    clean = parenMatch[1].trim();
  }

  // If input already looks like a formatted descriptive desktop application name
  if (
    clean.includes(' ') &&
    !clean.includes('http') &&
    !clean.includes('.com') &&
    !clean.includes('.org') &&
    !clean.includes('.ai') &&
    !clean.includes('.so')
  ) {
    return clean;
  }

  // Extract hostname if a full URL was passed
  let domain = clean.toLowerCase();
  try {
    if (domain.startsWith('http://') || domain.startsWith('https://')) {
      domain = new URL(domain).hostname;
    }
  } catch {
    // keep as is
  }
  domain = domain.replace(/^www\./, '').split(':')[0] || domain;

  // Direct exact match
  if (DOMAIN_APP_NAMES[domain]) {
    return DOMAIN_APP_NAMES[domain];
  }

  // Check suffix match (e.g. docs.github.com -> GitHub)
  for (const [key, name] of Object.entries(DOMAIN_APP_NAMES)) {
    if (domain === key || domain.endsWith('.' + key)) {
      return name;
    }
  }

  // Localhost variations
  if (domain.includes('localhost') || domain.includes('127.0.0.1')) {
    return 'Digital Attention Management';
  }

  // Fallback: capitalize main domain part nicely (e.g. "my-app.com" -> "My App")
  const parts = domain.split('.');
  const mainPart = parts.length > 1 ? parts[parts.length - 2] : parts[0];
  if (mainPart) {
    return mainPart
      .split(/[-_]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  return clean;
}

export function parseAppDetail(input?: string | null): { appName: string; detail?: string } {
  if (!input) return { appName: 'Unknown Application' };
  const clean = input.trim();
  if (!clean) return { appName: 'Unknown Application' };

  const parenMatch = clean.match(/^([^(]+)\s*\((.+)\)$/);
  if (parenMatch) {
    const appPart = parenMatch[1].trim();
    const detailPart = parenMatch[2].trim();
    return {
      appName: formatAppName(appPart),
      detail: detailPart,
    };
  }

  const appName = formatAppName(clean);
  const detail = appName.toLowerCase() !== clean.toLowerCase() ? clean : undefined;
  return { appName, detail };
}
