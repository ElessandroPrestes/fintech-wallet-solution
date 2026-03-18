import { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: 'primary' | 'ghost';
}

export function Button({
  children,
  loading,
  disabled,
  variant = 'primary',
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex w-full items-center justify-center rounded-md px-4 py-2.5 text-sm font-semibold',
        'transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' && [
          'bg-brand-600 text-white',
          'hover:bg-brand-700 focus:ring-brand-500',
        ],
        variant === 'ghost' && [
          'bg-transparent text-brand-600 underline-offset-4',
          'hover:underline focus:ring-brand-500',
        ],
        className,
      )}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          Aguarde...
        </span>
      ) : (
        children
      )}
    </button>
  );
}
