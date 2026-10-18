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
