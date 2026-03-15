interface LoadingSpinnerProps {
  /** Show full-screen centered layout */
  fullScreen?: boolean;
  /** Show "読み込み中..." label below the spinner */
  showLabel?: boolean;
  /** Custom label text */
  label?: string;
  /** Spinner size in pixels (default: 20) */
  size?: number;
}

export default function LoadingSpinner({
  fullScreen = false,
  showLabel = false,
  label = "読み込み中...",
  size = 20,
}: LoadingSpinnerProps) {
  const spinner = (
    <div className="flex flex-col items-center gap-3">
      {/* Spinner ring */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className="animate-spin"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
          className="text-neutral-800"
        />
        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          className="text-emerald-500"
        />
      </svg>

      {showLabel && (
        <span className="text-xs text-neutral-500 tracking-wide">{label}</span>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <div className="flex flex-col items-center gap-4">
          {/* Logo mark */}
          <div className="w-10 h-10 rounded-lg bg-neutral-900 border border-white/[0.06] flex items-center justify-center mb-2">
            <span className="text-white font-bold text-sm">M</span>
          </div>
          {spinner}
        </div>
      </div>
    );
  }

  return spinner;
}
