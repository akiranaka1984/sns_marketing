import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'ai' | 'neutral';

interface BadgeV2Props extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  live?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-emerald-500/12 text-emerald-400 border border-emerald-500/20',
  warning: 'bg-amber-500/12 text-amber-400 border border-amber-500/20',
  danger:  'bg-rose-500/12 text-rose-400 border border-rose-500/20',
  info:    'bg-sky-500/12 text-sky-400 border border-sky-500/20',
  ai:      'bg-violet-500/12 text-violet-400 border border-violet-500/20',
  neutral: 'bg-white/[0.06] text-neutral-400 border border-white/[0.10]',
};

const dotColorClasses: Record<BadgeVariant, string> = {
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger:  'bg-rose-400',
  info:    'bg-sky-400',
  ai:      'bg-violet-400',
  neutral: 'bg-neutral-400',
};

export function BadgeV2({ variant = 'neutral', live = false, className, children, ...rest }: BadgeV2Props) {
  const dotColor = dotColorClasses[variant];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5',
        'px-2 py-0.5 rounded-full',
        'text-[11px] font-medium tracking-[0.01em]',
        'whitespace-nowrap',
        variantClasses[variant],
        className
      )}
      {...rest}
    >
      {live && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span
            className={cn(
              'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
              dotColor
            )}
          />
          <span className={cn('relative inline-flex rounded-full h-1.5 w-1.5', dotColor)} />
        </span>
      )}
      {children}
    </span>
  );
}
