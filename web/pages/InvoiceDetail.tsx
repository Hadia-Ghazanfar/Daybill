import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useStrings } from '../utils/i18n';
import { toDigits, toWhatsApp } from '../utils/phone';
import { safeFileName } from '../utils/format';
import { shareInvoiceImage, shareViaNative, renderInvoicePng, isShareCancelled } from '../utils/whatsapp';
import { InvoiceDoc, InvoiceImage } from '../components/InvoiceImage';
import { ShareSheet, type ShareSheetState } from '../components/ShareSheet';
import { Card, Button, Spinner, Badge } from '../components/ui';
import { normalizeInvoice, normalizeInvoiceItem, type Invoice, type InvoiceItemView, type Customer } from '../utils/types';

interface DetailResponse {
  invoice: any;
  items: any[];
  customer: any;
}

function normalizeCustomer(raw: any): Customer {
  return {
    id: String(raw?.id ?? ''),
    name: String(raw?.name ?? ''),
    phone: String(raw?.phone ?? ''),
    address: raw?.address ?? '',
  };
}

function payLabel(method: string, t: ReturnType<typeof useStrings>): string {
  const m = (method || 'cash').toLowerCase();
  if (m === 'bank' || m === 'bank_transfer') return t['pay.bank'];
  if (m === 'card') return t['pay.card'];
  if (m === 'mobile' || m === 'wallet' || m === 'mobile_wallet') return t['pay.mobile'];
  return t['pay.cash'];
}

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const t = useStrings();
  const { user } = useAuth();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItemView[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [sheet, setSheet] = useState<{ state: ShareSheetState; error?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const waTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(false);
    try {
      const d = await api.get<DetailResponse>(`/invoices/${id}`);
      setInvoice(normalizeInvoice(d.invoice));
      setItems((d.items || []).map(normalizeInvoiceItem));
      setCustomer(normalizeCustomer(d.customer));
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    return () => {
      if (waTimer.current) clearTimeout(waTimer.current);
    };
  }, [load]);

  const logoUrl = (() => {
    try {
      return localStorage.getItem('daybill-shop-logo') || undefined;
    } catch {
      return undefined;
    }
  })();

  const docProps = invoice && customer
    ? {
        invoice: {
          invoiceNo: invoice.invoiceNo,
          date: invoice.date,
          discount: invoice.discount,
          paymentMethodLabel: payLabel(invoice.paymentMethod, t),
          dueStatus: invoice.dueStatus,
          dueStatusLabel: invoice.dueStatus === 'paid' ? t['inv.paid'] : t['inv.pending'],
          accentColor: invoice.accentColor,
          notes: invoice.notes,
        },
        items: items.map((it) => ({ productName: it.productName, qty: it.qty, price: it.price })),
        customer: { name: customer.name, phone: customer.phone, address: customer.address },
        shop: {
          name: user?.shopName ?? '',
          address: user?.shopAddress ?? '',
          logoUrl,
        },
      }
    : null;

  const fileName = invoice ? safeFileName(`Invoice-${invoice.invoiceNo || invoice.id}.png`) : 'Invoice.png';

  /** "Share on WhatsApp" — the EXACT contract flow. */
  const onShareWhatsApp = async () => {
    if (busy || !invoice || !customer) return;
    setBusy(true);
    // 1. Show "Preparing…" sheet immediately.
    setSheet({ state: 'preparing' });
    // 2+3. Render PNG + real download, everything under an ~8s timeout race.
    const res = await shareInvoiceImage({ invoiceNode: exportRef.current, phone: customer.phone, fileName });
    if (res === true) {
      // 4. Real download started → "Downloaded" sheet ~3.6s → open wa.me (image only, no ?text=).
      setSheet({ state: 'success' });
      waTimer.current = setTimeout(() => {
        setSheet(null);
        setBusy(false);
        window.open('https://wa.me/' + toWhatsApp(toDigits(customer.phone)), '_blank');
      }, 3600);
    } else {
      // 5. Failure/timeout → error sheet, buttons restored. Never hang on "Preparing…".
      setSheet({ state: 'error', error: t['share.error'] });
      setBusy(false);
    }
  };

  /** "Share image to another app" — native share sheet when available, else download. */
  const onShareOther = async () => {
    if (busy || !invoice) return;
    setBusy(true);
    setSheet({ state: 'preparing' });
    try {
      const blob = exportRef.current ? await renderInvoicePng(exportRef.current) : null;
      if (!blob) throw new Error('render-failed');
      const res = await shareViaNative([new File([blob], fileName, { type: 'image/png' })], 'Invoice');
      if (res === true) {
        setSheet({ state: 'success' });
        setBusy(false);
      } else if (isShareCancelled(res)) {
        setSheet(null);
        setBusy(false);
      } else {
        setSheet({ state: 'error', error: t['share.error'] });
        setBusy(false);
      }
    } catch {
      setSheet({ state: 'error', error: t['share.error'] });
      setBusy(false);
    }
  };

  const retryFromError = () => {
    if (sheet?.state === 'error') onShareWhatsApp();
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pb-28 pt-5 md:pb-10">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        {/* Back explicitly returns to /bills (never resets to home). */}
        <button
          type="button"
          onClick={() => navigate('/bills')}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 shadow-sm active:scale-95 transition"
          aria-label={t['inv.back']}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="rtl:rotate-180">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-xl font-extrabold text-teal-950 dark:text-white">
          {invoice ? invoice.invoiceNo : t['bills.title']}
        </h1>
        {invoice ? (
          <Badge variant={invoice.dueStatus === 'paid' ? 'success' : 'warning'} className="ms-auto">
            {invoice.dueStatus === 'paid' ? t['inv.paid'] : t['inv.pending']}
          </Badge>
        ) : null}
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-teal-800 dark:text-teal-200"><Spinner className="h-8 w-8" /></div>
      ) : null}

      {loadError || (!loading && !invoice) ? (
        <Card className="p-8 text-center">
          <p className="font-semibold text-slate-800 dark:text-slate-100">{t['inv.loadError']}</p>
          <Button className="mt-4" onClick={load}>{t['inv.retry']}</Button>
        </Card>
      ) : null}

      {invoice && docProps ? (
        <>
          {/* Visible invoice preview */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <InvoiceDoc {...docProps} />
            </div>
          </Card>

          {/* Actions */}
          <div className="mt-5 flex flex-col gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={onShareWhatsApp}
              className="flex w-full items-center justify-center gap-2.5 rounded-full bg-[#22c55e] hover:bg-[#16a34a] px-6 py-3.5 text-base font-bold text-white shadow-md transition active:scale-[0.98] disabled:opacity-60 ring-2 ring-[#22c55e]/40 ring-offset-2 ring-offset-white dark:ring-offset-slate-950"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18.2a8.2 8.2 0 01-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1112 20.2zm4.6-6.1c-.3-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 01-3.3-2.9c-.3-.4 0-.5.1-.7l.4-.5c.1-.2.1-.3 0-.5L9.4 8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.2-.7.6-.2.4-.9 2.2-.9 4.7 0 2.5 1.8 4.9 2 5.3.3.4 3.7 5.7 9 7.9 1.5.6 2.6 1 3.5 1.3 1.5.5 2.8.4 3.9.2.6-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2 0-.1-.3-.2-.6-.3z" />
              </svg>
              {t['inv.shareWhatsApp']}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M7 17L17 7M8 7h9v9" />
              </svg>
            </button>

            <Button variant="ghost" size="lg" disabled={busy} onClick={onShareOther} className="w-full rounded-full">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                <path d="M8.6 10.7l6.8-4.4M8.6 13.3l6.8 4.4" />
              </svg>
              {t['inv.shareOther']}
            </Button>

            <Button variant="ghost" size="lg" disabled={busy} onClick={() => navigate('/create')} className="w-full rounded-full">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              {t['inv.createAnother']}
            </Button>
            {/* NOTE: no "Save image" button — per contract. */}
          </div>

          {/* Offscreen export node — mounted only when data is ready. */}
          <InvoiceImage ref={exportRef} {...docProps} />
        </>
      ) : null}

      <ShareSheet
        state={sheet?.state ?? null}
        error={sheet?.error}
        onClose={() => { setSheet(null); setBusy(false); }}
        onRetry={retryFromError}
      />
    </div>
  );
}
