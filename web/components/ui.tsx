import { useEffect, useState, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type HTMLAttributes } from 'react';

/* ------------------------------------------------------------------ */
/* Button — variants: primary / secondary / ghost / danger; sizes sm/md/lg */
/* ------------------------------------------------------------------ */

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type BtnSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: BtnSize;
  loading?: boolean;
}

export function Button({ variant = 'primary', size = 'md', loading = false, className = '', children, disabled, ...rest }: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500';
  const variants: Record<BtnVariant, string> = {
    primary: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm',
    secondary: 'bg-white dark:bg-slate-800 text-teal-900 dark:text-white border border-slate-300 dark:border-white/15 hover:bg-slate-50 dark:hover:bg-white/10 shadow-sm',
    ghost:
      'bg-transparent text-teal-900 dark:text-teal-50 hover:bg-teal-900/5 dark:hover:bg-white/10 border border-teal-900/15 dark:border-white/20',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm',
  };
  const sizes: Record<BtnSize, string> = {
    sm: 'text-sm px-3 py-1.5',
    md: 'text-[15px] px-4 py-2.5',
    lg: 'text-base px-6 py-3',
  };
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} disabled={disabled || loading} {...rest}>
      {loading ? <Spinner className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Card                                                                */
/* ------------------------------------------------------------------ */

export function Card(props: HTMLAttributes<HTMLDivElement>) {
  const { className = '', ...rest } = props;
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-white/10 shadow-sm ${className}`} {...rest} />
  );
}

/* ------------------------------------------------------------------ */
/* Form fields                                                         */
/* ------------------------------------------------------------------ */

export function Field({ label, className = '', children }: { label?: ReactNode; className?: string; children?: ReactNode }) {
  return (
    <label className={`block ${className}`}>
      {label ? (
        <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      ) : null}
      {children}
    </label>
  );
}

const inputCls =
  'w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-[15px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500';

function withLabelEl(label: string | undefined, el: ReactNode) {
  if (!label) return <>{el}</>;
  return <Field label={label}>{el}</Field>;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  const { label, className = '', ...rest } = props;
  return withLabelEl(label, <input className={`${inputCls} ${className}`} {...rest} />);
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  const { label, className = '', children, ...rest } = props;
  return withLabelEl(
    label,
    <select className={`${inputCls} ${className}`} {...rest}>
      {children}
    </select>,
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  const { label, className = '', ...rest } = props;
  return withLabelEl(label, <textarea rows={3} className={`${inputCls} resize-y ${className}`} {...rest} />);
}

/* ------------------------------------------------------------------ */
/* Badge — variant: success / warning / danger / info / neutral         */
/* ------------------------------------------------------------------ */

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export function Badge(props: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant; children?: ReactNode }) {
  const { variant = 'neutral', className = '', ...rest } = props;
  const tones: Record<BadgeVariant, string> = {
    success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
    warning: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    danger: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
    info: 'bg-teal-100 text-teal-800 dark:bg-teal-500/15 dark:text-teal-300',
    neutral: 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${tones[variant]} ${className}`} {...rest} />
  );
}

/* ------------------------------------------------------------------ */
/* EmptyState                                                          */
/* ------------------------------------------------------------------ */

export function EmptyState({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-6">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-900/5 dark:bg-white/5">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-teal-800 dark:text-teal-200">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M9 8h1m4-4H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z" />
        </svg>
      </div>
      <p className="font-semibold text-slate-800 dark:text-slate-100">{title}</p>
      {description ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Spinner — div-based; size via className (default h-5 w-5)            */
/* ------------------------------------------------------------------ */

export function Spinner(props: HTMLAttributes<HTMLDivElement>) {
  const { className = '', ...rest } = props;
  return (
    <div
      role="status"
      aria-label="loading"
      className={`animate-spin rounded-full border-2 border-current border-t-transparent opacity-70 h-5 w-5 ${className}`}
      {...rest}
    />
  );
}

/* ------------------------------------------------------------------ */
/* SegmentedControl — string options                                    */
/* ------------------------------------------------------------------ */

export interface SegmentOption {
  value: string;
  label: string;
}

export function SegmentedControl({
  options,
  value,
  onChange,
  size = 'md',
  className = '',
}: {
  options: SegmentOption[];
  value: string;
  onChange: (v: string) => void;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <div role="tablist" className={`inline-flex items-center gap-0.5 rounded-xl bg-slate-100 dark:bg-white/10 p-1 ${className}`}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(o.value)}
            className={`rounded-lg font-semibold transition whitespace-nowrap ${
              size === 'sm' ? 'text-xs px-2.5 py-1.5' : 'text-sm px-3.5 py-2'
            } ${active ? 'bg-white dark:bg-slate-800 text-teal-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sheet — bottom-sheet container with backdrop                         */
/* ------------------------------------------------------------------ */

export function Sheet({
  open,
  onClose,
  children,
  labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  children?: ReactNode;
  labelledBy?: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    return undefined;
  }, [open ]);

  useEffect(() => {
    if (!open) return undefined;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity ${visible ? 'opacity-100' : 'opacity-0'}`}
        style={{ transitionDuration: '200ms' }}
        onClick={onClose}
      />
      <div
        className={`relative w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-5 pb-8 shadow-2xl transition-transform ${visible ? 'translate-y-0' : 'translate-y-full sm:translate-y-4'}`}
        style={{ transitionDuration: '260ms', transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)' }}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700" />
        {children}
      </div>
    </div>
  );
}
