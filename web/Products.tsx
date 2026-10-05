import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Badge, Button, Card, EmptyState, Field, Input, Sheet, Spinner } from './ui';
import { api } from './client';
import { useLanguage } from './i18n';
import { fmtMoney } from './format';

interface Product {
  id: string;
  name: string;
  costPrice?: number;
  cost_price?: number;
  sellingPrice?: number;
  selling_price?: number;
  stock?: number;
}

const costOf = (p: Product) => p.costPrice ?? p.cost_price ?? 0;
const priceOf = (p: Product) => p.sellingPrice ?? p.selling_price ?? 0;
const stockOf = (p: Product) => p.stock ?? 0;

const LOW_STOCK_THRESHOLD = 5;

function stockBadge(stock: number, t: (k: string) => string): { variant: 'danger' | 'warning' | 'success'; label: string } {
  if (stock <= 0) return { variant: 'danger', label: t('products.outOfStock') };
  if (stock <= LOW_STOCK_THRESHOLD) return { variant: 'warning', label: t('products.lowStock') };
  return { variant: 'success', label: t('products.inStock') };
}

export default function Products() {
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [cost, setCost] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const formTitleId = 'product-form-title';
  const deleteTitleId = 'product-delete-title';

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<{ products: Product[] }>('/api/products');
      setProducts(res.products ?? []);
    } catch {
      setError(t('products.errorLoad'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, query]);

  const openAdd = () => {
    setEditing(null);
    setName('');
    setCost('');
    setPrice('');
    setStock('0');
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setName(p.name);
    setCost(String(costOf(p)));
    setPrice(String(priceOf(p)));
    setStock(String(stockOf(p)));
    setFormError('');
    setFormOpen(true);
  };

  const submitForm = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError(t('products.nameRequired'));
      return;
    }
    const costNum = parseFloat(cost);
    const priceNum = parseFloat(price);
    const stockNum = parseInt(stock, 10);
    if (Number.isNaN(costNum) || costNum < 0 || Number.isNaN(priceNum) || priceNum < 0) {
      setFormError(t('products.invalidPrice'));
      return;
    }
    setSaving(true);
    setFormError('');
    const payload = {
      name: name.trim(),
      costPrice: costNum,
      sellingPrice: priceNum,
      stock: Number.isNaN(stockNum) ? 0 : Math.max(0, stockNum),
    };
    try {
      if (editing) await api.put(`/api/products/${editing.id}`, payload);
      else await api.post('/api/products', payload);
      setFormOpen(false);
      load();
    } catch {
      setFormError(t('products.errorLoad'));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.del(`/api/products/${deleteTarget.id}`);
      setDeleteTarget(null);
      load();
    } catch {
      /* keep sheet open on failure */
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t('products.title')}</h1>
        <Button size="sm" onClick={openAdd}>
          {t('products.addProduct')}
        </Button>
      </div>

      <div className="mt-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('products.search')}
          inputMode="search"
          aria-label={t('products.search')}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : error ? (
        <p className="py-8 text-center text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : filtered.length === 0 ? (
        <div className="py-8">
          <EmptyState title={t('products.noProducts')} description={t('products.noProductsHint')} />
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {filtered.map((p) => {
            const s = stockOf(p);
            const badge = stockBadge(s, t);
            return (
              <Card key={p.id} className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{p.name}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {t('products.cost')}: {fmtMoney(costOf(p))} · {t('products.selling')}: {fmtMoney(priceOf(p))}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        {t('products.stock')}: {s}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Button size="sm" variant="secondary" onClick={() => openEdit(p)}>
                      {t('products.edit')}
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setDeleteTarget(p)}>
                      {t('products.delete')}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / edit sheet */}
      <Sheet open={formOpen} onClose={() => setFormOpen(false)} labelledBy={formTitleId}>
        <h2 id={formTitleId} className="text-base font-bold text-slate-900 dark:text-white">
          {editing ? t('products.editProduct') : t('products.addProduct')}
        </h2>
        <form onSubmit={submitForm} className="mt-3 space-y-3">
          <Field label={t('products.name')}>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('products.costPrice')}>
              <Input value={cost} onChange={(e) => setCost(e.target.value)} inputMode="decimal" dir="ltr" />
            </Field>
            <Field label={t('products.sellingPrice')}>
              <Input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" dir="ltr" />
            </Field>
          </div>
          <Field label={t('products.stock')}>
            <Input value={stock} onChange={(e) => setStock(e.target.value)} inputMode="numeric" dir="ltr" />
          </Field>
          {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setFormOpen(false)}>
              {t('products.cancel')}
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? t('products.saving') : t('products.save')}
            </Button>
          </div>
        </form>
      </Sheet>

      {/* Delete confirm sheet */}
      <Sheet open={!!deleteTarget} onClose={() => setDeleteTarget(null)} labelledBy={deleteTitleId}>
        {deleteTarget && (
          <div>
            <h2 id={deleteTitleId} className="text-base font-bold text-slate-900 dark:text-white">
              {t('products.deleteTitle')}
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {t('products.deleteConfirm').replace('{name}', deleteTarget.name)}
            </p>
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setDeleteTarget(null)}>
                {t('products.cancel')}
              </Button>
              <Button variant="danger" className="flex-1" onClick={confirmDelete} disabled={deleting}>
                {deleting ? t('products.saving') : t('products.confirmDelete')}
              </Button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
