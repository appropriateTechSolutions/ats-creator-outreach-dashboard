import { useQueryClient } from '@tanstack/react-query';

type QueryKey = readonly unknown[];

/**
 * Returns an `invalidate(...keys)` function for mutation success handlers.
 *
 * This replaces the "refetch everything after every mutation" pattern (M4) with
 * targeted invalidation, and lets a single write invalidate *multiple* resources
 * (H5) — e.g. a partnership change also invalidates ['creators'] because the
 * Creators list shows partnership-derived status. TanStack Query is the single
 * cache now (the hand-rolled api cache was retired in Phase 3).
 */
export function useInvalidate() {
  const qc = useQueryClient();
  return (...keys: QueryKey[]) => {
    keys.forEach((key) => qc.invalidateQueries({ queryKey: key }));
  };
}
