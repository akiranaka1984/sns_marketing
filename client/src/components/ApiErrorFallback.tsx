import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";

interface ApiErrorFallbackProps {
  /** The error thrown by tRPC / React Query */
  error?: { message?: string } | null;
  /** Called when the user clicks the retry button */
  onRetry?: () => void;
  /** Optional label shown above the error message */
  title?: string;
  /** Controls the visual size of the fallback block */
  size?: "compact" | "default";
}

/**
 * Inline fallback UI shown inside a page section when an API query fails.
 * Hides raw DB / server error messages and shows a friendly description.
 */
export function ApiErrorFallback({
  error,
  onRetry,
  title = "データを読み込めませんでした",
  size = "default",
}: ApiErrorFallbackProps) {
  const isNetworkError =
    error?.message?.includes("Failed to fetch") ||
    error?.message?.includes("NetworkError") ||
    error?.message?.includes("ECONNREFUSED");

  const Icon = isNetworkError ? WifiOff : AlertTriangle;

  const description = isNetworkError
    ? "ネットワーク接続を確認してください"
    : "サーバーとの通信に失敗しました。しばらく待ってから再試行してください";

  if (size === "compact") {
    return (
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-rose-500/20 bg-rose-500/[0.05]">
        <Icon className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" strokeWidth={1.5} />
        <p className="text-[12px] text-rose-300 flex-1 leading-snug">{title}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            再試行
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {/* Icon */}
      <div className="w-12 h-12 rounded-xl bg-rose-500/[0.08] border border-rose-500/20 flex items-center justify-center mb-5">
        <Icon className="w-5 h-5 text-rose-400" strokeWidth={1.5} />
      </div>

      {/* Title */}
      <p className="text-[14px] font-semibold text-white mb-2">{title}</p>

      {/* Description */}
      <p className="text-[12px] text-neutral-500 max-w-xs leading-relaxed mb-6">
        {description}
      </p>

      {/* Retry button */}
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-neutral-200 text-[13px] font-medium transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          再試行
        </button>
      )}
    </div>
  );
}
