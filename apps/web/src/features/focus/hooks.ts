import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { focusApi, type StartFocusSessionPayload, type StopFocusSessionPayload } from '../../api/focus';

export function useActiveFocusSession() {
  return useQuery({
    queryKey: ['focus', 'active'],
    queryFn: () => focusApi.getActiveSession(),
    staleTime: 5000,
  });
}

export function useFocusSessionsList(limit = 20) {
  return useQuery({
    queryKey: ['focus', 'list', limit],
    queryFn: () => focusApi.listSessions(limit),
  });
}

export function useStartFocusSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: StartFocusSessionPayload) => focusApi.startSession(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['focus'] });
      void queryClient.invalidateQueries({ queryKey: ['activity'] });
    },
  });
}

export function useStopFocusSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: StopFocusSessionPayload }) =>
      focusApi.stopSession(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['focus'] });
      void queryClient.invalidateQueries({ queryKey: ['activity'] });
    },
  });
}
