import { logger } from '../../lib/logger';
import { Component, ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Scopes route-level failures to the content area instead of blanking the whole
 * app via the global ErrorBoundary. The common trigger is a failed dynamic
 * import ("Failed to fetch dynamically imported module") right after a redeploy
 * invalidates old chunk hashes for tabs that were left open. The layout (sidebar
 * + topbar) stays mounted; the user gets a soft "Try again" (re-mounts the route)
 * and a reliable "Reload" (fetches fresh chunks).
 */
export class RouteErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error) {
    logger.error('Route load error:', error);
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
