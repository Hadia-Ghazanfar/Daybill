import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useStrings } from '../utils/i18n';
import { fmtMoney, fmtDateShort } from '../utils/format';
import { Card, Input, Spinner, Button, SegmentedControl, Badge, EmptyState } from '../components/ui';
import { normalizeInvoice, normalizePurchase, type Invoice, type Purchase, type InvoiceSummary } from '../utils/types';

type StatusFilter = 'all' | 'paid' | 'pending';

interface InvoicesResponse {
  invoices: any[];
  summary: InvoiceSummary;
}

interface PurchasesResponse {
  purchases: any[];
}

function InvoiceRow({ invoice }: { invoice: Invoice }) {
  const t = useStrings();
  // List rows may not carry items; use server total when present.
  return (
    <Link
      to={`/bills/${invoice.id}`}
      className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-slate-50 dark:hover:bg-white/5 active:bg-slate-100 dark:active:bg-white/10"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-900/5 dark:bg-white/5">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-teal-800 dark:text-teal-200">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M9 8h1m4-4H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z" />
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-bold text-slate-900 dark:text-white">
          {invoice.customerName || invoice.invoiceNo}
        </span>
        <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
          {invoice.invoiceNo} · {fmtDateShort(invoice.date)}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-[15px] font-extrabold tabular-nums text-slate-900 dark:text-white">
          {invoice.total != null ? fmtMoney(invoice.total) : '—'}
        </span>
        <Badge variant={invoice.dueStatus === 'paid' ? 'success' : 'warning'}>
          {invoice.dueStatus === 'paid' ? t['bills.paid'] : t['bills.pending']}
        </Badge>
      </span>
    </Link>
  );
}

function PurchaseRow({ purchase }: { purchase: Purchase }) {
  const t = useStrings();
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-900/5 dark:bg-white/5">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-teal-800 dark:text-teal-200">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a2 2 0 00-2 2v9a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-bold text-slate-900 dark:text-white">{purchase.supplierName}</span>
        <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
          {fmtDateShort(purchase.date)} · {purchase.itemCount} {t['bills.itemsSuffix']}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-[15px] font-extrabold tabular-nums text-slate-900 dark:text-white">{fmtMoney(purchase.total)}</span>
        <Badge variant={purchase.delivered ? 'success' : 'warning'}>
          {purchase.delivered ? t['bills.delivered'] : t['bills.notDelivered']}
        </Badge>
      </span>
    </div>
  );
}

export default function Bills() {
  const t = useStrings();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<InvoiceSummary>({ total: 0, paid: 0, pending: 0 });
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async (st: StatusFilter, q: string) => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams();
      if (st !== 'all') params.set('status', st);
      if (q.trim()) params.set('q', q.trim());
      const qs = params.toString();
      const [invRes, purRes] = await Promise.all([
        api.get<InvoicesResponse>(`/invoices${qs ? `?${qs}` : ''}`),
        api.get<PurchasesResponse>('/purchases'),
      ]);
      setInvoices((invRes.invoices || []).map(normalizeInvoice));
      setSummary(invRes.summary || { total: 0, paid: 0, pending: 0 });
      setPurchases((purRes.purchases || []).map(normalizePurchase));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => load(status, query), 300);
    return () => clearTimeout(timer);
  }, [status, query, load]);

  const orders = purchases.filter((p) => p.type === 'purchase_order' && !p.delivered);
  const delivered = purchases.filter((p) => p.type === 'delivered_purchase' || p.delivered);

  const statusOptions = [
    { value: 'all' as StatusFilter, label: t['bills.all'] },
    { value: 'paid' as StatusFilter, label: t['bills.paid'] },
    { value: 'pending' as StatusFilter, label: t['bills.pending'] },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 pb-28 pt-5 md:pb-10">
      <h1 className="mb-4 text-2xl font-extrabold text-teal-950 dark:text-white">{t['bills.title']}</h1>

      {error && invoices.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="font-semibold text-slate-800 dark:text-slate-100">{t['bills.loadError']}</p>
          <Button className="mt-4" onClick={() => load(status, query)}>{t['dash.retry']}</Button>
        </Card>
      ) : (
        <>
          {/* Status summary chips */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-3 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t['bills.summaryTotal']}</p>
              <p className="mt-0.5 text-base font-extrabold tabular-nums text-teal-900 dark:text-white">{summary.total}</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t['bills.summaryPaid']}</p>
              <p className="mt-0.5 text-base font-extrabold tabular-nums text-emerald-700 dark:text-emerald-300">{summary.paid}</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t['bills.summaryPending']}</p>
              <p className="mt-0.5 text-base font-extrabold tabular-nums text-amber-700 dark:text-amber-300">{summary.pending}</p>
            </Card>
          </div>

          {/* Search + filter */}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <circle cx="11" cy="11" r="7" /><path strokeLinecap="round" d="M21 21l-4.3-4.3" />
              </svg>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t['bills.search']}
                className="ps-10"
                aria-label={t['bills.search']}
              />
            </div>
            <SegmentedControl options={statusOptions} value={status} onChange={(v) => setStatus(v as StatusFilter)} size="sm" />
          </div>

          {/* Invoice list */}
          <h2 className="mb-2 mt-6 text-base font-bold text-slate-800 dark:text-slate-100">{t['bills.invoices']}</h2>
          <Card className="overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-10 text-teal-800 dark:text-teal-200"><Spinner className="h-7 w-7" /></div>
            ) : invoices.length === 0 ? (
              <EmptyState title={t['bills.noInvoices']} description={t['bills.noInvoicesHint']} />
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-white/5">
                {invoices.map((inv) => (
                  <InvoiceRow key={inv.id} invoice={inv} />
                ))}
              </div>
            )}
          </Card>

          {/* Purchase documents */}
          <h2 className="mb-2 mt-8 text-base font-bold text-slate-800 dark:text-slate-100">{t['bills.purchases']}</h2>

          <p className="mb-2 mt-4 text-sm font-semibold text-slate-600 dark:text-slate-300">{t['bills.purchaseOrders']}</p>
          <Card className="overflow-hidden">
            {orders.length === 0 ? (
              <p className="px-4 py-5 text-center text-sm text-slate-400 dark:text-slate-500">{t['bills.noPurchases']}</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-white/5">
                {orders.map((p) => (
                  <PurchaseRow key={p.id} purchase={p} />
                ))}
              </div>
            )}
          </Card>

          <p className="mb-2 mt-4 text-sm font-semibold text-slate-600 dark:text-slate-300">{t['bills.deliveredPurchases']}</p>
          <Card className="overflow-hidden">
            {delivered.length === 0 ? (
              <p className="px-4 py-5 text-center text-sm text-slate-400 dark:text-slate-500">{t['bills.noPurchases']}</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-white/5">
                {delivered.map((p) => (
                  <PurchaseRow key={p.id} purchase={p} />
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
