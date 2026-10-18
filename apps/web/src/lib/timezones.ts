export interface TimezoneOption {
  value: string;
  label: string;
}

export interface TimezoneGroup {
  label: string;
  options: TimezoneOption[];
}

export const POPULAR_TIMEZONES: TimezoneOption[] = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata — India Standard Time (IST, UTC+05:30)' },
  { value: 'Asia/Calcutta', label: 'Asia/Calcutta — India (IST, UTC+05:30)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai — Gulf Standard Time (GST, UTC+04:00)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore — Singapore / Malaysia (SGT, UTC+08:00)' },
  { value: 'Asia/Bangkok', label: 'Asia/Bangkok — Thailand / Vietnam (ICT, UTC+07:00)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo — Japan Standard Time (JST, UTC+09:00)' },
  { value: 'Asia/Hong_Kong', label: 'Asia/Hong_Kong — Hong Kong (HKT, UTC+08:00)' },
  { value: 'Europe/London', label: 'Europe/London — United Kingdom (GMT/BST, UTC+00:00)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin — Germany / Central Europe (CET, UTC+01:00)' },
  { value: 'Europe/Paris', label: 'Europe/Paris — France (CET, UTC+01:00)' },
  { value: 'America/New_York', label: 'America/New_York — US Eastern (EST/EDT, UTC-05:00)' },
  { value: 'America/Chicago', label: 'America/Chicago — US Central (CST/CDT, UTC-06:00)' },
  { value: 'America/Denver', label: 'America/Denver — US Mountain (MST/MDT, UTC-07:00)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles — US Pacific (PST/PDT, UTC-08:00)' },
  { value: 'America/Toronto', label: 'America/Toronto — Canada Eastern (UTC-05:00)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney — Australia Eastern (AEST, UTC+10:00)' },
  { value: 'Pacific/Auckland', label: 'Pacific/Auckland — New Zealand (NZST, UTC+12:00)' },
  { value: 'UTC', label: 'UTC — Coordinated Universal Time (UTC+00:00)' },
];

export function getBrowserTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz === 'Asia/Calcutta') return 'Asia/Kolkata';
    return tz || 'Asia/Kolkata';
  } catch {
    return 'Asia/Kolkata';
  }
}

export function getTimezoneGroups(): TimezoneGroup[] {
  let allSupported: string[] = [];
  try {
    if (typeof Intl !== 'undefined' && typeof Intl.supportedValuesOf === 'function') {
      allSupported = Intl.supportedValuesOf('timeZone');
    }
  } catch {
    allSupported = [];
  }

  // Ensure Asia/Kolkata and Asia/Calcutta are always included
  const allSet = new Set<string>(allSupported);
  allSet.add('Asia/Kolkata');
  allSet.add('Asia/Calcutta');
  allSet.add('UTC');

  const asia: TimezoneOption[] = [];
  const europe: TimezoneOption[] = [];
  const america: TimezoneOption[] = [];
  const africa: TimezoneOption[] = [];
  const oceania: TimezoneOption[] = [];
  const others: TimezoneOption[] = [];

  for (const tz of Array.from(allSet).sort()) {
    const opt = { value: tz, label: tz.replace(/_/g, ' ') };
    if (tz.startsWith('Asia/')) {
      asia.push(opt);
    } else if (tz.startsWith('Europe/')) {
      europe.push(opt);
    } else if (tz.startsWith('America/') || tz.startsWith('US/') || tz.startsWith('Canada/')) {
      america.push(opt);
    } else if (tz.startsWith('Africa/')) {
      africa.push(opt);
    } else if (tz.startsWith('Australia/') || tz.startsWith('Pacific/')) {
      oceania.push(opt);
    } else {
      others.push(opt);
    }
  }

  // Put Asia/Kolkata at top of Asia list
  const kolkataIdx = asia.findIndex((o) => o.value === 'Asia/Kolkata');
  if (kolkataIdx > 0) {
    const [k] = asia.splice(kolkataIdx, 1);
    if (k) asia.unshift(k);
  }

  return [
    {
      label: '⭐ Popular & India Timezones',
      options: POPULAR_TIMEZONES,
    },
    {
      label: '🌏 Asia (including India / Kolkata)',
      options: asia,
    },
    {
      label: '🌍 Europe',
      options: europe,
    },
    {
      label: '🌎 Americas',
      options: america,
    },
    {
      label: '🌍 Africa & Indian Ocean',
      options: africa,
    },
    {
      label: '🌏 Australia & Pacific',
      options: oceania,
    },
    {
      label: '🌐 Others / Universal',
      options: others,
    },
  ];
}
