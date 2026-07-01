import { QueryClient } from '@tanstack/react-query';

// Defaults chosen to match the old hand-rolled cache's behavior so the migration
// is behavior-neutral: 60s stale window, no surprise refetch-on-focus. These can
// be relaxed (e.g. refetchOnWindowFocus) once the team is comfortable.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // 60s — the old CACHE_TTL horizon
      gcTime: 5 * 60_000, // keep unused data cached for 5 min
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
