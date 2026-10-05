import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  SegmentedControl,
  Sheet,
  Spinner,
} from './ui';
import { api } from './client';
import { useLanguage } from './i18n';
import { avatarFor } from './avatar';
import { toDigits, toDisplay, isValidPhone } from './phone';
import { fmtMoney } from './format';

type ContactKind = 'customer' | 'supplier';

interface Contact {
  id: string;
  name: string;
  phone: string;
  address?: string;
  totalBilled?: number;
  totalPayable?: number;
  invoiceCount?: number;
  purchaseCount?: number;
  lastTransaction?: string | null;
}

export default function Contacts() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [kind, setKind] = useState<ContactKind>('customer');
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState<Contact[]>([]);
  const [suppliers, setSuppliers] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);

  // add-contact form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const endpoint = kind === 'customer' ? '/api/customers' : '/api/suppliers';

  const load = async (q: string, k: ContactKind) => {
    setLoading(true);
    setError('');
    try {
      if (k === 'customer') {
        const res = await api.get<{ customers: Contact[] }>(`/api/customers?q=${encodeURIComponent(q)}`);
        setCustomers(res.customers ?? []);
      } else {
        const res = await api.get<{ suppliers: Contact[] }>(`/api/suppliers?q=${encodeURIComponent(q)}`);
        setSuppliers(res.suppliers ?? []);
      }
    } catch {
      setError(t('contacts.errorLoad'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => load(query, kind), 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, kind]);

  const openAdd = () => {
    setName('');
    setPhone('');
    setAddress('');
    setFormError('');
    setSheetOpen(true);
  };

  const submitAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError(t('contacts.nameRequired'));
      return;
    }
    if (!isValidPhone(phone)) {
      setFormError(t('contacts.phoneInvalid'));
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await api.post(endpoint, {
        name: name.trim(),
        phone: toDigits(phone), // storage format: digits only
        address: address.trim() || undefined,
      });
      setSheetOpen(false);
      load(query, kind);
    } catch {
      setFormError(t('contacts.errorLoad'));
    } finally {
      setSaving(false);
    }
  };

  const list = kind === 'customer' ? customers : suppliers;
  const isCustomer = kind === 'customer';
  const sheetTitleId = 'add-contact-title';

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t('contacts.title')}</h1>
        <Button size="sm" onClick={openAdd}>
          {isCustomer ? t('contacts.addCustomer') : t('contacts.addSupplier')}
        </Button>
      </div>

      <div className="mt-3">
        <SegmentedControl
          value={kind}
          onChange={(v) => setKind(v as ContactKind)}
          options={[
            { value: 'customer', label: t('contacts.customers') },
            { value: 'supplier', label: t('contacts.suppliers') },
          ]}
        />
      </div>

      <div className="mt-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isCustomer ? t('contacts.searchCustomers') : t('contacts.searchSuppliers')}
          inputMode="search"
          aria-label={isCustomer ? t('contacts.searchCustomers') : t('contacts.searchSuppliers')}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : error ? (
        <p className="py-8 text-center text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : list.length === 0 ? (
        <div className="py-8">
          <EmptyState
            title={isCustomer ? t('contacts.noCustomers') : t('contacts.noSuppliers')}
            description={t('contacts.addFirst').replace(
              '{type}',
              isCustomer ? t('contacts.customers').toLowerCase() : t('contacts.suppliers').toLowerCase(),
            )}
          />
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {list.map((c) => {
            const total = isCustomer ? c.totalBilled ?? 0 : c.totalPayable ?? c.totalBilled ?? 0;
            const count = isCustomer ? c.invoiceCount ?? 0 : c.purchaseCount ?? c.invoiceCount ?? 0;
            return (
              <Card key={c.id} className="p-0">
                <button
                  type="button"
                  onClick={() => navigate(`/contacts/${c.id}?type=${kind}`)}
                  className="flex w-full items-center gap-3 p-3 text-start"
                >
                  <img
                    src={avatarFor(c.id)}
                    alt=""
                    className="h-11 w-11 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {c.name}
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400" dir="ltr">
                      {toDisplay(c.phone)}
                    </span>
                  </span>
                  <span className="shrink-0 text-end">
                    <span className="block text-sm font-bold text-[#0B3B39] dark:text-emerald-300">
                      {fmtMoney(total)}
                    </span>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                      {isCustomer ? t('contacts.totalBilled') : t('contacts.totalPayable')} · {count}{' '}
                      {isCustomer ? t('contacts.invoices') : t('contacts.purchases')}
                    </span>
                  </span>
                </button>
              </Card>
            );
          })}
        </div>
      )}

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} labelledBy={sheetTitleId}>
        <h2 id={sheetTitleId} className="text-base font-bold text-slate-900 dark:text-white">
          {isCustomer ? t('contacts.addCustomer') : t('contacts.addSupplier')}
        </h2>
        <form onSubmit={submitAdd} className="mt-3 space-y-3">
          <Field label={t('contacts.name')}>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('contacts.name')} autoFocus />
          </Field>
          <div>
            <Field label={t('contacts.phone')}>
              <Input
                value={phone}
                onChange={(e) => setPhone(toDisplay(e.target.value))}
                placeholder="0300-0000000"
                inputMode="tel"
                dir="ltr"
              />
            </Field>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{t('contacts.phoneHint')}</p>
          </div>
          <Field label={t('contacts.addressOptional')}>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t('contacts.address')} />
          </Field>
          {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setSheetOpen(false)}>
              {t('contacts.cancel')}
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? t('contacts.saving') : t('contacts.save')}
            </Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}
