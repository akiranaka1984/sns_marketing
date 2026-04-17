import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline' | 'ai';
type Size = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonV2Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white ' +
    'shadow-[0_1px_2px_rgba(0,0,0,0.20),inset_0_0_0_1px_rgba(16,185,129,0.30)] ' +
    'hover:from-emerald-400 hover:to-emerald-500 ' +
    'hover:shadow-[0_4px_12px_rgba(16,185,129,0.25),0_1px_2px_rgba(0,0,0,0.15)] ' +
    'active:scale-[0.98]',
  secondary:
    'bg-white/[0.07] border border-white/[0.10] text-neutral-300 ' +
    'hover:bg-white/[0.11] hover:border-white/[0.15] hover:text-neutral-50',
  ghost:
    'bg-transparent text-neutral-400 ' +
    'hover:bg-white/[0.05] hover:text-neutral-300',
  destructive:
    'bg-rose-500/12 border border-rose-500/20 text-rose-400 ' +
    'hover:bg-rose-500/20',
  outline:
    'bg-transparent border border-white/[0.10] text-neutral-300 ' +
    'hover:bg-white/[0.05] hover:border-white/[0.20]',
  ai:
    'bg-gradient-to-br from-violet-500 to-violet-600 text-white ' +
    'shadow-[0_0_16px_rgba(167,139,250,0.25)] ' +
    'hover:from-violet-400 hover:to-violet-500 ' +
    'hover:shadow-[0_4px_16px_rgba(167,139,250,0.35)]',
};

const sizeClasses: Record<Size, string> = {
  xs: 'h-6 px-2 text-[11px] rounded-md gap-1.5',
  sm: 'h-[30px] px-3 text-[12px] rounded-md gap-1.5',
  md: 'h-9 px-4 text-[13px] rounded-lg gap-2',
  lg: 'h-[42px] px-5 text-[14px] rounded-lg gap-2',
};

export const ButtonV2 = forwardRef<HTMLButtonElement, ButtonV2Props>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading,
      leftIcon,
      rightIcon,
      fullWidth,
      className,
      children,
      disabled,
      ...rest
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-medium',
          'transition-all duration-150 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
          'tracking-[-0.008em]',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          className
        )}
        {...rest}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : leftIcon}
        {children}
        {!loading && rightIcon}
      </button>
    );
  }
);
ButtonV2.displayName = 'ButtonV2';
