import { logger } from '../../lib/logger';
import { Component, ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

// Matches the various browser-specific messages for a lazy chunk 404 (Vite
// build reference gone after a redeploy). Chromium, Firefox and Safari all
// phrase this differently, so match loosely.
const CHUNK_LOAD_ERROR = /dynamically imported module|importing a module script failed/i;

const CHUNK_RELOAD_KEY = 'ats_chunk_reload_attempted';

/**
 * Call once from App after mount. If the app is still running fine ~10s
 * after load, the chunk error that triggered a reload (if any) is resolved,
 * so allow a future chunk error in this tab to auto-reload again.
 */
export function clearChunkReloadGuard() {
  const timer = setTimeout(() => sessionStorage.removeItem(CHUNK_RELOAD_KEY), 10_000);
  return () => clearTimeout(timer);
}

/**
 * Scopes route-level failures to the content area instead of blanking the whole
 * app via the global ErrorBoundary. The common trigger is a failed dynamic
 * import ("Failed to fetch dynamically imported module") right after a redeploy
 * invalidates old chunk hashes for tabs that were left open. The layout (sidebar
 * + topbar) stays mounted; the user gets a soft "Try again" (re-mounts the route)
 * and a reliable "Reload" (fetches fresh chunks).
 *
 * For that common case we skip the manual step entirely: reload once
 * automatically. The sessionStorage guard stops a reload loop if the chunk is
 * still missing after reloading (e.g. mid-deploy); the user then falls back to
 * this UI. `clearChunkReloadGuard` (called from App on mount) clears the guard
 * once the app has been running for a bit, so a later redeploy can still
 * trigger an auto-reload in the same tab.
 */
export class RouteErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error) {
    logger.error('Route load error:', error);

    if (CHUNK_LOAD_ERROR.test(error.message) && !sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
      sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
      window.location.reload();
    }
  }

  private reset = () => this.setState({ hasError: false });

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full flex flex-col items-center justify-center gap-5 p-8 text-center animate-[fadeIn_0.2s_ease]">
          <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle size={26} />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-normal text-gray-900 font-outfit uppercase tracking-tight">
              This page couldn't load
            </h2>
            <p className="text-sm text-gray-500 max-w-sm">
              A new version may have just been deployed. Reload to fetch the latest.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={this.reset}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow-sm"
            >
              <RefreshCw size={15} /> Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
