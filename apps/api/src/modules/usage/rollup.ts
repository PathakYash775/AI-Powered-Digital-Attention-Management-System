import { prisma } from '../../lib/prisma.js';

export interface LocalTimeParts {
  dateStr: string;
  hour: number;
  minute: number;
  second: number;
}

export function getLocalParts(date: Date, timeZone: string): LocalTimeParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);

  let year = '1970';
  let month = '01';
  let day = '01';
  let hour = 0;
  let minute = 0;
  let second = 0;

  for (const part of parts) {
    if (part.type === 'year') year = part.value;
    else if (part.type === 'month') month = part.value;
    else if (part.type === 'day') day = part.value;
    else if (part.type === 'hour') hour = parseInt(part.value, 10);
    else if (part.type === 'minute') minute = parseInt(part.value, 10);
    else if (part.type === 'second') second = parseInt(part.value, 10);
  }

  return {
    dateStr: `${year}-${month}-${day}`,
    hour,
    minute,
    second,
  };
}

export function getLocalDateString(date: Date, timeZone: string): string {
  return getLocalParts(date, timeZone).dateStr;
}

export function getZonedDayBounds(dateStr: string, timeZone: string): { startUtc: Date; endUtc: Date } {
  const [yStr, mStr, dStr] = dateStr.split('-');
  const y = parseInt(yStr ?? '1970', 10);
  const m = parseInt(mStr ?? '1', 10);
  const d = parseInt(dStr ?? '1', 10);

  const getOffsetMs = (date: Date): number => {
    const parts = getLocalParts(date, timeZone);
    const [pyStr, pmStr, pdStr] = parts.dateStr.split('-');
    const py = parseInt(pyStr ?? '1970', 10);
    const pm = parseInt(pmStr ?? '1', 10);
    const pd = parseInt(pdStr ?? '1', 10);
    const localUtcMs = Date.UTC(py, pm - 1, pd, parts.hour, parts.minute, parts.second);
    return localUtcMs - date.getTime();
  };

  const approxStart = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  const startOffsetMs = getOffsetMs(approxStart);
  const startUtc = new Date(approxStart.getTime() - startOffsetMs);

  const approxEnd = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0));
  const endOffsetMs = getOffsetMs(approxEnd);
  const endUtc = new Date(approxEnd.getTime() - endOffsetMs);

  return { startUtc, endUtc };
}

export function collectAffectedDatesForActivity(
  events: Array<{ startedAt: Date; endedAt: Date }>,
  timeZone: string,
): string[] {
  const dates = new Set<string>();

  for (const event of events) {
    let cur = event.startedAt.getTime();
    const end = event.endedAt.getTime();
    while (cur < end) {
      const parts = getLocalParts(new Date(cur), timeZone);
      dates.add(parts.dateStr);
      const secUntilNextHour = 3600 - (parts.minute * 60 + parts.second);
      cur = Math.min(end, cur + secUntilNextHour * 1000);
    }
  }

  return Array.from(dates);
}

export async function recomputeUsageForDates(userId: string, targetDates: string[]): Promise<void> {
  if (targetDates.length === 0) return;

  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { timezone: true },
  });
  const timeZone = profile?.timezone ?? 'UTC';

  for (const dateStr of targetDates) {
    const { startUtc, endUtc } = getZonedDayBounds(dateStr, timeZone);

    const [activities, switches, notifications] = await Promise.all([
      prisma.activityLog.findMany({
        where: {
          userId,
          startedAt: { lt: endUtc },
          endedAt: { gt: startUtc },
        },
      }),
      prisma.contextSwitch.findMany({
        where: {
          userId,
          switchedAt: { gte: startUtc, lt: endUtc },
        },
      }),
      prisma.notificationEvent.findMany({
        where: {
          userId,
          receivedAt: { gte: startUtc, lt: endUtc },
        },
      }),
    ]);

    let dailyActiveSec = 0;
    let dailyIdleSec = 0;
    const domainSeconds: Record<string, number> = {};
    const categorySeconds: Record<string, number> = {
      productive: 0,
      social: 0,
      communication: 0,
      entertainment: 0,
      other: 0,
    };

    const hourlyStats = Array.from({ length: 24 }, () => ({
      activeSec: 0,
      idleSec: 0,
      switchCount: 0,
      notificationCount: 0,
    }));

    for (const log of activities) {
      const logStart = Math.max(log.startedAt.getTime(), startUtc.getTime());
      const logEnd = Math.min(log.endedAt.getTime(), endUtc.getTime());

      let current = logStart;
      while (current < logEnd) {
        const parts = getLocalParts(new Date(current), timeZone);
        const secUntilNextHour = 3600 - (parts.minute * 60 + parts.second);
        const nextBoundary = current + secUntilNextHour * 1000;
        const chunkEnd = Math.min(logEnd, nextBoundary);
        const chunkSec = Math.round((chunkEnd - current) / 1000);

        if (chunkSec > 0 && parts.dateStr === dateStr && parts.hour >= 0 && parts.hour < 24) {
          const hourBucket = hourlyStats[parts.hour];
          if (hourBucket) {
            if (log.idle) {
              hourBucket.idleSec += chunkSec;
              dailyIdleSec += chunkSec;
            } else {
              hourBucket.activeSec += chunkSec;
              dailyActiveSec += chunkSec;
              domainSeconds[log.domain] = (domainSeconds[log.domain] ?? 0) + chunkSec;
              categorySeconds[log.category] = (categorySeconds[log.category] ?? 0) + chunkSec;
            }
          }
        }

        current = chunkEnd;
      }
    }

    for (const sw of switches) {
      const parts = getLocalParts(sw.switchedAt, timeZone);
      if (parts.dateStr === dateStr && parts.hour >= 0 && parts.hour < 24) {
        const hourBucket = hourlyStats[parts.hour];
        if (hourBucket) {
          hourBucket.switchCount += 1;
        }
      }
    }

    for (const notif of notifications) {
      const parts = getLocalParts(notif.receivedAt, timeZone);
      if (parts.dateStr === dateStr && parts.hour >= 0 && parts.hour < 24) {
        const hourBucket = hourlyStats[parts.hour];
        if (hourBucket) {
          hourBucket.notificationCount += 1;
        }
      }
    }

    const topSites = Object.entries(domainSeconds)
      .map(([name, durationSec]) => ({ name, durationSec }))
      .sort((a, b) => b.durationSec - a.durationSec)
      .slice(0, 5);

    const byCategory = Object.entries(categorySeconds).map(([category, durationSec]) => ({
      category,
      durationSec,
    }));

    const totalScreenSec = dailyActiveSec + dailyIdleSec;
    const switchCount = switches.length;
    const notificationCount = notifications.length;

    await prisma.dailyUsageStat.upsert({
      where: {
        userId_date: {
          userId,
          date: dateStr,
        },
      },
      create: {
        userId,
        date: dateStr,
        totalScreenSec,
        activeSec: dailyActiveSec,
        idleSec: dailyIdleSec,
        switchCount,
        notificationCount,
        topSites,
        byCategory,
      },
      update: {
        totalScreenSec,
        activeSec: dailyActiveSec,
        idleSec: dailyIdleSec,
        switchCount,
        notificationCount,
        topSites,
        byCategory,
      },
    });

    const hourlyUpserts = hourlyStats.map((stat, h) =>
      prisma.hourlyUsagePattern.upsert({
        where: {
          userId_date_hour: {
            userId,
            date: dateStr,
            hour: h,
          },
        },
        create: {
          userId,
          date: dateStr,
          hour: h,
          activeSec: stat.activeSec,
          idleSec: stat.idleSec,
          switchCount: stat.switchCount,
          notificationCount: stat.notificationCount,
        },
        update: {
          activeSec: stat.activeSec,
          idleSec: stat.idleSec,
          switchCount: stat.switchCount,
          notificationCount: stat.notificationCount,
        },
      }),
    );

    await Promise.all(hourlyUpserts);
  }
}
