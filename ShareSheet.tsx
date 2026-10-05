import { useEffect } from 'react';
import { Sheet, Spinner, Button } from './ui';
import { useStrings } from '../utils/i18n';

export type ShareSheetState = 'preparing' | 'success' | 'error';

/**
 * Bottom-sheet popup for the WhatsApp share flow.
 *  - preparing: "Preparing…" + spinner (shown immediately on tap)
 *  - success: "Downloaded" + green check, auto-dismisses after ~3.6s
 *  - error: message + Retry / Close, buttons restored
 */
export function ShareSheet({
  state,
  error,
  onClose,
  onRetry,
}: {
  state: ShareSheetState | null;
  error?: string;
  onClose: () => void;
  onRetry?: () => void;
}) {
  const t = useStrings();

  useEffect(() => {
    if (state !== 'success') return undefined;
    const timer = setTimeout(onClose, 3600);
    return () => clearTimeout(timer);
  }, [state, onClose]);

  return (
    <Sheet open={state !== null} onClose={onClose} labelledBy="share-sheet-title">
      {state === 'preparing' ? (
        <div className="flex flex-col items-center py-6 text-center">
          <span className="text-teal-800 dark:text-teal-200">
            <Spinner className="h-9 w-9" />
          </span>
          <p id="share-sheet-title" className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
            {t['share.preparing']}
          </p>
        </div>
      ) : null}

      {state === 'success' ? (
        <div className="flex flex-col items-center py-6 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/15">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </span>
          <p id="share-sheet-title" className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
            {t['share.downloaded']}
          </p>
          <p className="mt-1 max-w-xs text-sm text-slate-500 dark:text-slate-400">{t['share.downloadHint']}</p>
        </div>
      ) : null}

      {state === 'error' ? (
        <div className="flex flex-col items-center py-4 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/15">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.2" strokeLinecap="round">
              <path d="M12 8v5m0 3.5v.5" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </span>
          <p id="share-sheet-title" className="mt-4 text-base font-bold text-slate-900 dark:text-white">
            {error || t['share.error']}
          </p>
          <div className="mt-5 flex w-full gap-3">
            <Button variant="ghost" className="flex-1" onClick={onClose}>
              {t['share.close']}
            </Button>
            {onRetry ? (
              <Button className="flex-1" onClick={onRetry}>
                {t['share.retry']}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </Sheet>
  );
}
