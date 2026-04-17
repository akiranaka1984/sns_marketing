import { type LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

type AccentColor = 'emerald' | 'amber' | 'violet' | 'sky' | 'rose';

interface MetricCardV2Props {
  label: string;
  value: number | string;
  sub?: string;
  delta?: number;
  deltaLabel?: string;
  icon?: LucideIcon;
  accent?: AccentColor;
  className?: string;
}

const accentGradients: Record<AccentColor, string> = {
  emerald: 'from-emerald-500 to-emerald-400',
  amber:   'from-amber-500 to-amber-400',
  violet:  'from-violet-500 to-violet-400',
  sky:     'from-sky-500 to-sky-400',
  rose:    'from-rose-500 to-rose-400',
};

const accentIconBg: Record<AccentColor, string> = {
  emerald: 'bg-emerald-500/10 text-emerald-400',
  amber:   'bg-amber-500/10 text-amber-400',
  violet:  'bg-violet-500/10 text-violet-400',
  sky:     'bg-sky-500/10 text-sky-400',
  rose:    'bg-rose-500/10 text-rose-400',
};

function DeltaIndicator({ delta, deltaLabel }: { delta: number; deltaLabel: string }) {
  const isPositive = delta > 0;
  const isNeutral = delta === 0;

  const Icon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;

  const colorClass = isNeutral
    ? 'text-neutral-500'
    : isPositive
    ? 'text-emerald-400'
    : 'text-rose-400';

  const bgClass = isNeutral
    ? 'bg-white/[0.05]'
    : isPositive
    ? 'bg-emerald-500/10'
    : 'bg-rose-500/10';

  const sign = isPositive ? '+' : '';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md',
        'text-[11px] font-medium',
        colorClass,
        bgClass
      )}
    >
      <Icon className="w-3 h-3 shrink-0" />
      {sign}{delta}% {deltaLabel}
    </span>
  );
}

export function MetricCardV2({
  label,
  value,
  sub,
  delta,
  deltaLabel = 'vs 先月',
  icon: Icon,
  accent = 'emerald',
  className,
}: MetricCardV2Props) {
  return (
    <div
      className={cn(
        'relative rounded-xl overflow-hidden',
        'bg-white/[0.04] border border-white/[0.07]',
        'p-4',
        className
      )}
    >
      {/* Top accent gradient line */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 h-[2px]',
          'bg-gradient-to-r',
          accentGradients[accent]
        )}
      />

      {/* Header row: label + optional icon */}
      <div className="flex items-start justify-between mb-3">
        <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-[0.06em]">
          {label}
        </span>
        {Icon && (
          <span
            className={cn(
              'flex items-center justify-center w-7 h-7 rounded-lg',
              accentIconBg[accent]
            )}
          >
            <Icon className="w-3.5 h-3.5" />
          </span>
        )}
      </div>

      {/* Big value */}
      <p className="font-display text-[28px] font-bold text-neutral-50 leading-none tracking-[-0.03em] mb-1">
        {value}
      </p>

      {/* Sub text */}
      {sub && (
        <p className="text-[12px] text-neutral-500 mb-2 truncate">{sub}</p>
      )}

      {/* Delta */}
      {delta !== undefined && (
        <div className="mt-2">
          <DeltaIndicator delta={delta} deltaLabel={deltaLabel} />
        </div>
      )}
    </div>
  );
}
