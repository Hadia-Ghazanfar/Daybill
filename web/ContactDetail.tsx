import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Badge, Button, Card, EmptyState, Spinner } from './ui';
import { api } from './client';
import { useLanguage } from './i18n';
import { avatarFor } from './avatar';
import { toDisplay } from './phone';
import { fmtMoney, fmtDateLong } from './format';

interface ContactInfo {
  id: string;
  name: string;
  phone: string;
  address?: string;
}

interface ContactStats {
  totalBilled?: number;
  totalPayable?: number;
  invoiceCount?: number;
  purchaseCount?: number;
  paidTotal?: number;
  pendingTotal?: number;
  lastTransaction?: string | null;
}

interface HistoryInvoice {
  id: string;
  invoice_no?: string;
  invoiceNo?: string;
  date?: string;
  created_at?: string;
  createdAt?: string;
  total?: number;
  amount?: number;
  due_status?: string;
  status?: string;
}

interface HistoryPurchase {
  id: string;
  date?: string;
  created_at?: string;
  createdAt?: string;
  total?: number;
  amount?: number;
  type?: string;
  delivered?: number | boolean;
  itemCount?: number;
}

function isPaid(status: string | undefined): boolean {
  const s = (status ?? '').toLowerCase();
  return s === 'paid' || s === 'received';
}

export default function ContactDetail() {
  const { t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const type = searchParams.get('type') === 'supplier' ? 'supplier' : 'customer';
  const isCustomer = type === 'customer';

  const [contact, setContact] = useState<ContactInfo | null>(null);
  const [stats, setStats] = useState<ContactStats | null>(null);
  const [history, setHistory] = useState<Array<HistoryInvoice | HistoryPurchase>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    const endpoint = isCustomer ? `/api/customers/${id}` : `/api/suppliers/${id}`;
    setLoading(true);
    setError('');
    api
      .get<{ customer?: ContactInfo; supplier?: ContactInfo; stats: ContactStats; history: Array<HistoryInvoice | HistoryPurchase> }>(endpoint)
      .then((res) => {
        setContact(res.customer ?? res.supplier ?? null);
        setStats(res.stats ?? null);
        setHistory(res.history ?? []);
      })
      .catch(() => setError(t('contactDetail.errorLoad')))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, type]);

  const total = isCustomer ? stats?.totalBilled ?? 0 : stats?.totalPayable ?? stats?.totalBilled ?? 0;
  const count = isCustomer ? stats?.invoiceCount ?? 0 : stats?.purchaseCount ?? stats?.invoiceCount ?? 0;

  const statCards = [
    { label: isCustomer ? t('contactDetail.totalBilled') : t('contactDetail.totalPayable'), value: fmtMoney(total) },
    { label: isCustomer ? t('contactDetail.invoices') : t('contactDetail.purchases'), value: String(count) },
    { label: t('contactDetail.paid'), value: fmtMoney(stats?.paidTotal ?? 0) },
    { label: t('contactDetail.pending'), value: fmtMoney(stats?.pendingTotal ?? 0) },
    {
      label: t('contactDetail.lastTransaction'),
      value: stats?.lastTransaction ? fmtDateLong(stats.lastTransaction) || '—' : t('contactDetail.never'),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/contacts')}>
          <span className="rtl:rotate-180" aria-hidden>←</span> {t('contactDetail.back')}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : error || !contact ? (
        <p className="py-8 text-center text-sm text-red-600 dark:text-red-400">{error || t('contactDetail.errorLoad')}</p>
      ) : (
        <>
          {/* Header band: deep teal, white text */}
          <div className="mt-3 overflow-hidden rounded-2xl bg-[#0B3B39]">
            <div className="flex items-center gap-4 p-4">
              <img
                src={avatarFor(contact.id)}
                alt=""
                className="h-16 w-16 rounded-full bg-white/10 ring-2 ring-white/30"
              />
              <div className="min-w-0">
                <p className="truncate text-lg font-bold text-white">{contact.name}</p>
                <p className="text-sm text-white/80" dir="ltr">
                  {toDisplay(contact.phone)}
                </p>
                {contact.address && <p className="truncate text-xs text-white/70">{contact.address}</p>}
                <div className="mt-1">
                  <Badge variant="neutral" className="bg-white/15 text-white">
                    {isCustomer ? t('contactDetail.customer') : t('contactDetail.supplier')}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {statCards.map((s) => (
              <Card key={s.label} className="p-3">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{s.label}</p>
                <p className="mt-0.5 text-base font-bold text-slate-900 dark:text-white">{s.value}</p>
              </Card>
            ))}
          </div>

          {/* Chronological history */}
          <h2 className="mt-5 text-sm font-bold text-slate-900 dark:text-white">{t('contactDetail.history')}</h2>
          {history.length === 0 ? (
            <div className="py-6">
              <EmptyState title={t('contactDetail.noHistory')} />
            </div>
          ) : (
            <div className="mt-2 space-y-2">
              {history.map((h) =>
                isCustomer ? (
                  <InvoiceHistoryRow key={h.id} item={h as HistoryInvoice} t={t} />
                ) : (
                  <PurchaseHistoryRow key={h.id} item={h as HistoryPurchase} t={t} />
                ),
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function InvoiceHistoryRow({ item, t }: { item: HistoryInvoice; t: (k: string) => string }) {
  const status = item.due_status ?? item.status ?? 'pending';
  const paid = isPaid(status);
  const total = item.total ?? item.amount ?? 0;
  const label = item.invoice_no ?? item.invoiceNo ?? item.id.slice(0, 8);
  return (
    <Card className="flex items-center justify-between gap-3 p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">#{label}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{fmtDateLong(item.date ?? item.created_at ?? item.createdAt) || '—'}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-sm font-bold text-slate-900 dark:text-white">{fmtMoney(total)}</span>
        <Badge variant={paid ? 'success' : 'warning'}>{paid ? t('contactDetail.paidBadge') : t('contactDetail.pendingBadge')}</Badge>
      </div>
    </Card>
  );
}

function PurchaseHistoryRow({ item, t }: { item: HistoryPurchase; t: (k: string) => string }) {
  const delivered = item.delivered === 1 || item.delivered === true;
  const isPO = (item.type ?? 'delivered_purchase') === 'purchase_order';
  const total = item.total ?? item.amount ?? 0;
  return (
    <Card className="flex items-center justify-between gap-3 p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
          {isPO ? t('contactDetail.purchaseOrder') : t('contactDetail.delivered')}
          {item.itemCount != null ? ` · ${item.itemCount}` : ''}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{fmtDateLong(item.date ?? item.created_at ?? item.createdAt) || '—'}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-sm font-bold text-slate-900 dark:text-white">{fmtMoney(total)}</span>
        <Badge variant={isPO && !delivered ? 'info' : 'success'}>
          {isPO && !delivered ? t('contactDetail.purchaseOrder') : t('contactDetail.delivered')}
        </Badge>
      </div>
    </Card>
  );
}
