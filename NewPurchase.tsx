import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Field, Input, SegmentedControl, Select, Spinner, Textarea } from '../components/ui';
import { api } from '../api/client';
import { useLanguage } from '../i18n';
import { fmtMoney, todayISO } from '../utils/format';

type PurchaseType = 'purchase_order' | 'delivered_purchase';

interface Supplier {
  id: string;
  name: string;
  phone: string;
}

interface Product {
  id: string;
  name: string;
  costPrice?: number;
  cost_price?: number;
  stock?: number;
}

const costOf = (p: Product) => p.costPrice ?? p.cost_price ?? 0;

interface Line {
  productId: string;
  qty: string;
  cost: string;
}

export default function NewPurchase() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [supplierId, setSupplierId] = useState('');
  const [type, setType] = useState<PurchaseType>('delivered_purchase');
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([{ productId: '', qty: '1', cost: '' }]);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<{ suppliers: Supplier[] }>('/api/suppliers'),
      api.get<{ products: Product[] }>('/api/products'),
    ])
      .then(([s, p]) => {
        setSuppliers(s.suppliers ?? []);
        setProducts(p.products ?? []);
      })
      .catch(() => setError(t('purchase.errorLoad')))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const productById = (pid: string) => products.find((p) => p.id === pid);

  const updateLine = (i: number, patch: Partial<Line>) => {
    setLines((prev) => {
      const next = [...prev];
      const merged = { ...next[i], ...patch };
      // prefill cost from product when the product changes and cost is empty
      if (patch.productId && !merged.cost) {
        const prod = products.find((p) => p.id === patch.productId);
        if (prod) merged.cost = String(costOf(prod));
      }
      next[i] = merged;
      return next;
    });
  };

  const addLine = () => setLines((prev) => [...prev, { productId: '', qty: '1', cost: '' }]);
  const removeLine = (i: number) => setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));

  const lineTotal = (l: Line) => {
    const q = parseFloat(l.qty);
    const c = parseFloat(l.cost);
    return Number.isNaN(q) || Number.isNaN(c) ? 0 : q * c;
  };
  const total = lines.reduce((sum, l) => sum + lineTotal(l), 0);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      setFormError(t('purchase.selectSupplierFirst'));
      return;
    }
    if (lines.length === 0) {
      setFormError(t('purchase.addAtLeastOne'));
      return;
    }
    const items = lines.map((l) => ({
      productId: l.productId,
      qty: parseInt(l.qty, 10),
      cost: parseFloat(l.cost),
    }));
    if (items.some((it) => !it.productId || Number.isNaN(it.qty) || it.qty <= 0 || Number.isNaN(it.cost) || it.cost < 0)) {
      setFormError(t('purchase.invalidItem'));
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await api.post('/api/purchases', {
        supplierId,
        date,
        type,
        items,
        notes: notes.trim() || undefined,
      });
      navigate('/bills');
    } catch {
      setFormError(t('purchase.errorLoad'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-4">
      <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t('purchase.title')}</h1>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : error ? (
        <p className="py-8 text-center text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : (
        <form onSubmit={submit} className="mt-3 space-y-4">
          <Card className="space-y-3 p-4">
            <Field label={t('purchase.supplier')}>
              <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">{t('purchase.selectSupplier')}</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>

            <div>
              <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                {t('purchase.type')}
              </span>
              <SegmentedControl
                value={type}
                onChange={(v) => setType(v as PurchaseType)}
                options={[
                  { value: 'delivered_purchase', label: t('purchase.deliveredPurchase') },
                  { value: 'purchase_order', label: t('purchase.purchaseOrder') },
                ]}
              />
              <p
                className={`mt-1.5 rounded-lg px-2.5 py-1.5 text-xs ${
                  type === 'purchase_order'
                    ? 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                    : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                }`}
              >
                {type === 'purchase_order' ? t('purchase.poHint') : t('purchase.deliveredHint')}
              </p>
            </div>

            <Field label={t('purchase.date')}>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} dir="ltr" />
            </Field>
          </Card>

          <Card className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">{t('purchase.items')}</h2>
              <Button type="button" size="sm" variant="secondary" onClick={addLine}>
                + {t('purchase.addItem')}
              </Button>
            </div>

            {lines.map((line, i) => (
              <div key={i} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_72px_110px_auto] sm:items-end">
                  <Field label={i === 0 ? t('purchase.product') : undefined}>
                    <Select value={line.productId} onChange={(e) => updateLine(i, { productId: e.target.value })}>
                      <option value="">{t('purchase.selectProduct')}</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label={i === 0 ? t('purchase.qty') : undefined}>
                    <Input value={line.qty} onChange={(e) => updateLine(i, { qty: e.target.value })} inputMode="numeric" dir="ltr" />
                  </Field>
                  <Field label={i === 0 ? t('purchase.cost') : undefined}>
                    <Input value={line.cost} onChange={(e) => updateLine(i, { cost: e.target.value })} inputMode="decimal" dir="ltr" />
                  </Field>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{fmtMoney(lineTotal(line))}</span>
                    {lines.length > 1 && (
                      <Button type="button" size="sm" variant="ghost" onClick={() => removeLine(i)}>
                        {t('purchase.removeItem')}
                      </Button>
                    )}
                  </div>
                </div>
                {line.productId && productById(line.productId) && (
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    {t('products.stock')}: {productById(line.productId)!.stock ?? 0} · {t('purchase.cost')}:{' '}
                    {fmtMoney(costOf(productById(line.productId)!))}
                  </p>
                )}
              </div>
            ))}

            <div className="flex items-center justify-between border-t border-slate-200 pt-2 dark:border-slate-700">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{t('purchase.total')}</span>
              <span className="text-lg font-bold text-[#0B3B39] dark:text-emerald-300">{fmtMoney(total)}</span>
            </div>
          </Card>

          <Card className="p-4">
            <Field label={t('purchase.notes')}>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder={t('purchase.notesPlaceholder')} />
            </Field>
          </Card>

          {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? t('purchase.creating') : t('purchase.create')}
          </Button>
        </form>
      )}
    </div>
  );
}
