import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * On every route change, resets the main scroll region to the top and moves
 * focus to the page's <main> landmark. This keeps keyboard/screen-reader users
 * from being stranded on the previous page's focus position and fixes scroll
 * carrying over between routes. Renders nothing.
 */
export function RouteFocusManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    const main = document.getElementById('main-content');
    if (main) {
      main.scrollTo?.({ top: 0 });
      main.focus({ preventScroll: true });
    } else {
      window.scrollTo({ top: 0 });
    }
  }, [pathname]);

  return null;
}
