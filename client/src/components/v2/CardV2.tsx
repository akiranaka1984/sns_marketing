import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type CardVariant = 'default' | 'interactive' | 'selected';
type CardPadding = 'compact' | 'default' | 'comfortable';

interface CardV2Props extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
}

const variantClasses: Record<CardVariant, string> = {
  default:
    'bg-white/[0.04] border border-white/[0.07]',
  interactive:
    'bg-white/[0.04] border border-white/[0.07] ' +
    'cursor-pointer ' +
    'hover:bg-white/[0.07] hover:border-white/[0.12] ' +
    'hover:shadow-[0_4px_24px_rgba(0,0,0,0.25)] ' +
    'active:scale-[0.995] ' +
    'transition-all duration-150 ease-out',
  selected:
    'bg-emerald-500/[0.06] border border-emerald-500/[0.30] ' +
    'shadow-[0_0_0_1px_rgba(16,185,129,0.15),0_4px_16px_rgba(16,185,129,0.08)]',
};

const paddingClasses: Record<CardPadding, string> = {
  compact: 'p-3',
  default: 'p-4',
  comfortable: 'p-5',
};

export const CardV2 = forwardRef<HTMLDivElement, CardV2Props>(
  ({ variant = 'default', padding = 'default', className, children, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl',
          variantClasses[variant],
          paddingClasses[padding],
          variant !== 'interactive' && 'transition-colors duration-150',
          className
        )}
        {...rest}
      >
        {children}
      </div>
    );
  }
);
CardV2.displayName = 'CardV2';

// Sub-components for composable card layouts
export const CardV2Header = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...rest }, ref) => (
    <div ref={ref} className={cn('flex items-center justify-between mb-3', className)} {...rest}>
      {children}
    </div>
  )
);
CardV2Header.displayName = 'CardV2Header';

export const CardV2Title = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...rest }, ref) => (
    <p
      ref={ref}
      className={cn('text-[13px] font-medium text-neutral-200 tracking-[-0.008em]', className)}
      {...rest}
    >
      {children}
    </p>
  )
);
CardV2Title.displayName = 'CardV2Title';

export const CardV2Body = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...rest }, ref) => (
    <div ref={ref} className={cn('text-[13px] text-neutral-400', className)} {...rest}>
      {children}
    </div>
  )
);
CardV2Body.displayName = 'CardV2Body';

export const CardV2Footer = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06]', className)}
      {...rest}
    >
      {children}
    </div>
  )
);
CardV2Footer.displayName = 'CardV2Footer';
