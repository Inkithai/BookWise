'use client';

/**
 * Shared auth form primitives.
 *
 * Every auth screen (login, register, OTP, forgot/reset password) composes
 * these so field sizing, radii, focus rings, error states and button styling
 * stay identical across the flow. Teal is the only accent colour used here —
 * it comes from the Tailwind `teal-*` scale which is backed by the brand
 * tokens in globals.css.
 */

import * as React from 'react';
import { AlertCircle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Sizing tokens ──────────────────────────────────────────────────────── */

/** Height shared by every text control and button on the auth screens. */
export const AUTH_FIELD_H = 'h-12';

/** Base look of a text control: 48px tall, rounded, subtle inner shadow. */
export const AUTH_FIELD_BASE = cn(
  AUTH_FIELD_H,
  'w-full min-w-0 box-border rounded-xl border bg-white text-[15px] leading-normal',
  'text-slate-900 placeholder:text-slate-400 shadow-sm',
  'transition-[color,background-color,border-color,box-shadow] duration-200',
  'outline-none focus:outline-none',
  'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400'
);

/** Resting + focus colours for a valid control. */
export const AUTH_FIELD_IDLE =
  'border-slate-200 hover:border-slate-300 focus:border-teal-600 focus:ring-4 focus:ring-teal-500/15';

/** Resting + focus colours for a control in an error state. */
export const AUTH_FIELD_ERROR =
  'border-red-400 bg-red-50/60 focus:border-red-500 focus:ring-4 focus:ring-red-500/15';

export const authFieldClass = (hasError?: boolean, className?: string) =>
  cn(AUTH_FIELD_BASE, hasError ? AUTH_FIELD_ERROR : AUTH_FIELD_IDLE, className);

/* ── Label ──────────────────────────────────────────────────────────────── */

export function AuthLabel({
  htmlFor,
  children,
  required,
  hint,
  className,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
  hint?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between gap-2', className)}>
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium text-slate-700"
      >
        {children}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {hint}
    </div>
  );
}

/* ── Inline error ───────────────────────────────────────────────────────── */

export function AuthFieldError({ id, children }: { id?: string; children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="flex items-start gap-1.5">
      <AlertCircle className="mt-[3px] h-3.5 w-3.5 shrink-0 text-red-500" />
      <p id={id} className="text-xs font-medium text-red-600">
        {children}
      </p>
    </div>
  );
}

/* ── Text input with icon affordances ───────────────────────────────────── */

type AuthInputProps = React.ComponentProps<'input'> & {
  /** Leading icon element, rendered inside the control on the left. */
  icon?: React.ReactNode;
  /** Trailing adornment (reveal toggle, validity tick, spinner…). */
  trailing?: React.ReactNode;
  hasError?: boolean;
};

export const AuthInput = React.forwardRef<HTMLInputElement, AuthInputProps>(
  function AuthInput({ icon, trailing, hasError, className, ...props }, ref) {
    return (
      <div className={cn('relative', AUTH_FIELD_H)}>
        {icon && (
          <span
            className={cn(
              'pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 [&_svg]:h-[18px] [&_svg]:w-[18px]',
              hasError ? 'text-red-400' : 'text-slate-400'
            )}
          >
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={authFieldClass(
            hasError,
            cn(icon ? 'pl-11' : 'pl-4', trailing ? 'pr-11' : 'pr-4', className)
          )}
          {...props}
        />
        {trailing && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
            {trailing}
          </span>
        )}
      </div>
    );
  }
);

/* ── Reveal-password toggle ─────────────────────────────────────────────── */

export function AuthRevealToggle({
  shown,
  onToggle,
  disabled,
  label = 'password',
}: {
  shown: boolean;
  onToggle: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-label={`${shown ? 'Hide' : 'Show'} ${label}`}
      className="rounded-md p-0.5 text-slate-400 transition-colors hover:text-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 disabled:opacity-50"
    >
      {shown ? (
        /* eye-off */
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
          <path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
          <line x1="2" y1="2" x2="22" y2="22" />
        </svg>
      ) : (
        /* eye */
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  );
}

/* ── Buttons ────────────────────────────────────────────────────────────── */

const Spinner = ({ className }: { className?: string }) => (
  <svg className={cn('animate-spin', className)} fill="none" viewBox="0 0 24 24" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

type AuthButtonProps = React.ComponentProps<'button'> & {
  loading?: boolean;
  loadingText?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: React.ReactNode;
};

export function AuthButton({
  loading,
  loadingText,
  variant = 'primary',
  icon,
  children,
  className,
  disabled,
  ...props
}: AuthButtonProps) {
  const base = cn(
    AUTH_FIELD_H,
    'inline-flex w-full items-center justify-center gap-2 rounded-xl px-6',
    'text-[15px] font-semibold tracking-[-0.01em]',
    'transition-all duration-200 active:scale-[0.99]',
    'focus:outline-none focus-visible:ring-4',
    'disabled:pointer-events-none disabled:opacity-55'
  );

  const variants = {
    primary: cn(
      'bg-teal-700 text-white shadow-sm shadow-teal-900/15',
      'hover:bg-teal-800 hover:shadow-md hover:shadow-teal-900/20',
      'focus-visible:ring-teal-500/35'
    ),
    secondary: cn(
      'border border-slate-200 bg-white text-slate-700 shadow-sm',
      'hover:border-teal-300 hover:bg-teal-50/60 hover:text-teal-800',
      'focus-visible:ring-teal-500/25'
    ),
    ghost: cn(
      'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
      'focus-visible:ring-slate-400/30'
    ),
  } as const;

  return (
    <button
      className={cn(base, variants[variant], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <Spinner className="h-[18px] w-[18px]" />
          <span>{loadingText ?? 'Please wait…'}</span>
        </>
      ) : (
        <>
          {icon}
          <span>{children}</span>
        </>
      )}
    </button>
  );
}

/* ── Checkbox ───────────────────────────────────────────────────────────── */

export function AuthCheckbox({
  id,
  checked,
  onChange,
  disabled,
  error,
  children,
  className,
}: {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  error?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label
      htmlFor={id}
      className={cn('group flex cursor-pointer items-center gap-2.5 select-none', className)}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-150',
          'peer-focus-visible:ring-4 peer-focus-visible:ring-teal-500/25',
          checked
            ? 'border-teal-700 bg-teal-700 text-white'
            : error
              ? 'border-red-400 bg-red-50'
              : 'border-slate-300 bg-white group-hover:border-teal-500'
        )}
      >
        {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </span>
      <span className="text-sm text-slate-600">{children}</span>
    </label>
  );
}

/* ── Divider ────────────────────────────────────────────────────────────── */

export function AuthDivider({ children = 'or' }: { children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3" role="separator">
      <span className="h-px flex-1 bg-slate-200" />
      <span className="text-xs font-medium uppercase tracking-wider text-slate-400">{children}</span>
      <span className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

/* ── Form-level alert ───────────────────────────────────────────────────── */

export function AuthAlert({
  title,
  details,
}: {
  title: React.ReactNode;
  details?: Record<string, string>;
}) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
    >
      <AlertCircle className="mt-0.5 h-[18px] w-[18px] shrink-0 text-red-500" />
      <div className="flex-1 text-sm">
        <p className="font-medium text-red-700">{title}</p>
        {details && Object.keys(details).length > 0 && (
          <ul className="mt-1.5 ml-4 space-y-0.5 text-xs text-red-600">
            {Object.entries(details).map(([field, message]) => (
              <li key={field} className="list-disc">
                <span className="font-medium capitalize">{field.replace(/_/g, ' ')}:</span> {message}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
