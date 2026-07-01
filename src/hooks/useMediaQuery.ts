import { useEffect, useState } from 'react';

/**
 * Subscribe to a CSS media query and re-render when it changes. Unlike a one-shot
 * `window.innerWidth` read, this stays correct across resize / orientation change.
 * SSR-safe: returns `defaultValue` when `window.matchMedia` is unavailable.
 */
export function useMediaQuery(query: string, defaultValue = false): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return defaultValue;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** Tailwind's `lg` breakpoint (1024px) — the sidebar's desktop threshold. */
export const useIsDesktop = (): boolean => useMediaQuery('(min-width: 1024px)', true);
