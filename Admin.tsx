import { useEffect, useState } from 'react';
import { Badge, Card, EmptyState, Spinner } from '../components/ui';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n';
import { avatarFor } from '../utils/avatar';
import { toDisplay } from '../utils/phone';
import { fmtDateLong } from '../utils/format';

interface Account {
  id: string;
  name: string;
  phone: string;
  shopName?: string;
  shop_name?: string;
  shopAddress?: string;
  shop_address?: string;
  createdAt?: string;
  created_at?: string;
}

interface FeedbackItem {
  id: string;
  user_id?: string;
  userId?: string;
  senderName?: string;
  sender_name?: string;
  name?: string;
  shopName?: string;
  shop_name?: string;
  shop?: string;
  phone?: string;
  category?: string;
  message?: string;
  createdAt?: string;
  created_at?: string;
}

const shopNameOf = (a: Account) => a.shopName ?? a.shop_name ?? '—';
const shopAddrOf = (a: Account) => a.shopAddress ?? a.shop_address ?? '—';
const createdOf = (a: Account) => a.createdAt ?? a.created_at;

const fbSender = (f: FeedbackItem) => f.senderName ?? f.sender_name ?? f.name ?? '—';
const fbShop = (f: FeedbackItem) => f.shopName ?? f.shop_name ?? f.shop ?? '—';
const fbCreated = (f: FeedbackItem) => f.createdAt ?? f.created_at;
const fbUserId = (f: FeedbackItem) => f.user_id ?? f.userId ?? f.id;

function categoryVariant(category: string | undefined): 'danger' | 'info' | 'neutral' {
  if (category === 'Bug') return 'danger';
  if (category === 'Suggestion') return 'info';
  return 'neutral';
}

export default function Admin() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      setLoading(false);
      return;
    }
    Promise.all([
      api.get<{ accounts: Account[] }>('/api/admin/accounts'),
      api.get<{ feedback: FeedbackItem[] }>('/api/feedback'),
    ])
      .then(([a, f]) => {
        setAccounts(a.accounts ?? []);
        setFeedback(f.feedback ?? []);
      })
      .catch(() => setError(t('admin.errorLoad')))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!loading && (!user || user.role !== 'admin')) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-16">
        <EmptyState title={t('admin.accessDenied')} description={t('admin.accessDeniedHint')} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-4">
      <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t('admin.title')}</h1>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : error ? (
        <p className="py-8 text-center text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : (
        <>
          {/* (a) Registered accounts — newest first */}
          <h2 className="mt-4 text-sm font-bold text-slate-900 dark:text-white">
            {t('admin.accounts')} ({accounts.length})
          </h2>
          {accounts.length === 0 ? (
            <div className="py-4">
              <EmptyState title={t('admin.noAccounts')} />
            </div>
          ) : (
            <div className="mt-2 space-y-2">
              {accounts.map((a) => (
                <Card key={a.id} className="p-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={avatarFor(a.id)}
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{a.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400" dir="ltr">
                        {toDisplay(a.phone)}
                      </p>
                      <p className="truncate text-xs text-slate-600 dark:text-slate-300">
                        {shopNameOf(a)}
                        {shopAddrOf(a) !== '—' ? ` · ${shopAddrOf(a)}` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 text-end text-[11px] text-slate-500 dark:text-slate-400">
                      {t('admin.createdOn')}
                      <br />
                      {fmtDateLong(createdOf(a)) || '—'}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* (b) User feedback — newest first */}
          <h2 className="mt-6 text-sm font-bold text-slate-900 dark:text-white">
            {t('admin.userFeedback')} ({feedback.length})
          </h2>
          {feedback.length === 0 ? (
            <div className="py-4">
              <EmptyState title={t('admin.noFeedback')} />
            </div>
          ) : (
            <div className="mt-2 space-y-2">
              {feedback.map((f) => (
                <Card key={f.id} className="p-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={avatarFor(fbUserId(f))}
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{fbSender(f)}</p>
                        <Badge variant={categoryVariant(f.category)}>{f.category ?? '—'}</Badge>
                      </div>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {fbShop(f)} · <span dir="ltr">{toDisplay(f.phone)}</span>
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] text-slate-500 dark:text-slate-400">{fmtDateLong(fbCreated(f)) || '—'}</span>
                  </div>
                  {f.message && (
                    <p className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-2.5 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {f.message}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
