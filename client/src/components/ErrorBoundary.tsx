import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      const isDev = import.meta.env.DEV;

      return (
        <div className="flex items-center justify-center min-h-screen p-8 bg-neutral-950">
          <div className="flex flex-col items-center w-full max-w-2xl">
            {/* Icon */}
            <div className="w-14 h-14 rounded-xl bg-neutral-900 border border-white/[0.06] flex items-center justify-center mb-6">
              <AlertTriangle size={24} className="text-emerald-500" />
            </div>

            {/* Title */}
            <h1 className="text-lg font-semibold text-white mb-1">
              An unexpected error occurred
            </h1>

            {/* Error message */}
            {this.state.error?.message && (
              <p className="text-sm text-neutral-400 mb-6 text-center max-w-md">
                {this.state.error.message}
              </p>
            )}

            {/* Stack trace (dev only) */}
            {isDev && this.state.error?.stack && (
              <div className="w-full rounded-lg bg-neutral-900 border border-white/[0.06] p-4 overflow-auto mb-6">
                <p className="text-xs text-neutral-500 font-mono mb-2 uppercase tracking-wider">
                  Stack Trace
                </p>
                <pre className="text-xs text-neutral-400 whitespace-pre-wrap break-all leading-relaxed">
                  {this.state.error.stack}
                </pre>
              </div>
            )}

            {/* Reload button */}
            <button
              onClick={() => globalThis.location.reload()}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium transition-colors cursor-pointer"
            >
              <RotateCcw size={14} />
              再読み込み
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
