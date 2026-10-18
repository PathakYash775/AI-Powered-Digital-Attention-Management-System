import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { activityApi } from '../../api/activity';

export function useActivitySummary(date: string) {
  return useQuery({
    queryKey: ['activity', 'summary', date],
    queryFn: () => activityApi.getSummary(date),
  });
}

export function useActivityReport(date: string) {
  return useQuery({
    queryKey: ['activity', 'report', date],
    queryFn: () => activityApi.getReport(date),
  });
}

export function useActivitySessions(filters: { from?: string; to?: string }) {
  return useInfiniteQuery({
    queryKey: ['activity', 'sessions', filters],
    queryFn: ({ pageParam }) =>
      activityApi.getSessions({
        from: filters.from,
        to: filters.to,
        cursor: pageParam ?? undefined,
        limit: 10,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function useTaskSwitches(filters: { from?: string; to?: string }) {
  return useInfiniteQuery({
    queryKey: ['activity', 'switches', filters],
    queryFn: ({ pageParam }) =>
      activityApi.getSwitches({
        from: filters.from,
        to: filters.to,
        cursor: pageParam ?? undefined,
        limit: 10,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function useActivityNotifications(filters: { from?: string; to?: string }) {
  return useInfiniteQuery({
    queryKey: ['activity', 'notifications', filters],
    queryFn: ({ pageParam }) =>
      activityApi.getNotifications({
        from: filters.from,
        to: filters.to,
        cursor: pageParam ?? undefined,
        limit: 10,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}
