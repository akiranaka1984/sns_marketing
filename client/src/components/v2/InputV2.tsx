import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type InputSize = 'sm' | 'md' | 'lg';

interface InputV2Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  helper?: string;
  error?: string;
  size?: InputSize;
  leftElement?: ReactNode;
  rightElement?: ReactNode;
}

const sizeClasses: Record<InputSize, string> = {
  sm: 'h-7 text-[12px] px-2.5',
  md: 'h-9 text-[13px] px-3',
  lg: 'h-11 text-[14px] px-3.5',
};

const leftPaddingClasses: Record<InputSize, string> = {
  sm: 'pl-7',
  md: 'pl-9',
  lg: 'pl-10',
};

const rightPaddingClasses: Record<InputSize, string> = {
  sm: 'pr-7',
  md: 'pr-9',
  lg: 'pr-10',
};

export const InputV2 = forwardRef<HTMLInputElement, InputV2Props>(
  (
    {
      label,
      helper,
      error,
      size = 'md',
      leftElement,
      rightElement,
      className,
      id: idProp,
      disabled,
      ...rest
    },
    ref
  ) => {
    const generatedId = useId();
    const id = idProp ?? generatedId;
    const hasError = Boolean(error);

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={id}
            className="text-[12px] font-medium text-neutral-400 tracking-[0.01em] uppercase"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {leftElement && (
            <span
              className={cn(
                'absolute left-0 flex items-center justify-center text-neutral-500 pointer-events-none',
                size === 'sm' && 'w-7 h-7 text-[12px]',
                size === 'md' && 'w-9 h-9 text-[13px]',
                size === 'lg' && 'w-10 h-11 text-[14px]'
              )}
            >
              {leftElement}
            </span>
          )}

          <input
            ref={ref}
            id={id}
            disabled={disabled}
            className={cn(
              'w-full rounded-lg',
              'bg-white/[0.05] border',
              'text-neutral-100 placeholder:text-neutral-600',
              'transition-all duration-150 ease-out',
              'outline-none',
              // normal border
              !hasError && 'border-white/[0.10]',
              // focus glow
              !hasError &&
                'focus:border-emerald-500/50 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.12)] focus:bg-white/[0.07]',
              // error state
              hasError && 'border-rose-500/40 shadow-[0_0_0_3px_rgba(244,63,94,0.10)]',
              hasError && 'focus:border-rose-500/60 focus:shadow-[0_0_0_3px_rgba(244,63,94,0.16)]',
              // disabled
              disabled && 'opacity-50 cursor-not-allowed',
              // size
              sizeClasses[size],
              // icon padding overrides
              leftElement && leftPaddingClasses[size],
              rightElement && rightPaddingClasses[size],
              className
            )}
            {...rest}
          />

          {rightElement && (
            <span
              className={cn(
                'absolute right-0 flex items-center justify-center text-neutral-500',
                size === 'sm' && 'w-7 h-7 text-[12px]',
                size === 'md' && 'w-9 h-9 text-[13px]',
                size === 'lg' && 'w-10 h-11 text-[14px]'
              )}
            >
              {rightElement}
            </span>
          )}
        </div>

        {(helper || error) && (
          <p
            className={cn(
              'text-[11px] leading-relaxed',
              hasError ? 'text-rose-400' : 'text-neutral-500'
            )}
          >
            {error ?? helper}
          </p>
        )}
      </div>
    );
  }
);
InputV2.displayName = 'InputV2';
