import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useStrings } from '../utils/i18n';
import { fmtMoney, todayISO } from '../utils/format';
import { Card, Input, Select, Textarea, Button, Spinner, SegmentedControl, Field, Badge, EmptyState } from '../components/ui';
import { InvoiceDoc } from '../components/InvoiceImage';
import type { Customer, Product, DueStatus } from '../utils/types';

const ACCENTS = ['#0B3B39', '#10B981', '#2563EB', '#7C3AED', '#DC2626', '#EA580C'];
const PAY_METHODS = ['cash', 'bank', 'card', 'mobile'] as const;
const LOGO_KEY = 'daybill-shop-logo';

interface Line {
  productId: string;
  productName: string;
  stock: number;
  qty: number;
  price: number;
}

export default function CreateInvoice() {
  const t = useStrings();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [customerId, setCustomerId] = useState('');
  const [date, setDate] = useState(todayISO());
  const [lines, setLines] = useState<Line[]>([]);
  const [discount, setDiscount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [dueStatus, setDueStatus] = useState<DueStatus>('pending');
  const [accentColor, setAccentColor] = useState(ACCENTS[0]);
  const [notes, setNotes] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(() => {
    try {
      return localStorage.getItem(LOGO_KEY) || undefined;
    } catch {
      return undefined;
    }
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [cRes, pRes] = await Promise.all([
          api.get<{ customers: any[] }>('/customers'),
          api.get<{ products: any[] }>('/products'),
        ]);
        setCustomers((cRes.customers || []).map((c: any) => ({
          id: String(c.id), name: String(c.name), phone: String(c.phone), address: c.address,
        })));
        setProducts((pRes.products || []).map((p: any) => ({
          id: String(p.id),
          name: String(p.name),
          costPrice: Number(p.costPrice ?? p.cost_price ?? 0),
          sellingPrice: Number(p.sellingPrice ?? p.selling_price ?? 0),
          stock: Number(p.stock ?? 0),
        })));
      } catch {
        /* keep empty lists; page shows empty states */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectedCustomer = customers.find((c) => c.id === customerId);

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, productQuery]);

  const subtotal = lines.reduce((s, l) => s + l.qty * l.price, 0);
  const discountNum = Math.min(Math.max(Number(discount) || 0, 0), subtotal);
  const total = subtotal - discountNum;

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 2600);
  };

  const addProduct = (p: Product) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === p.id);
      if (existing) {
        if (existing.qty + 1 > p.stock) {
          flash(t['create.stockBlocked'].replace('{n}', String(p.stock)));
          return prev;
        }
        return prev.map((l) => (l.productId === p.id ? { ...l, qty: l.qty + 1 } : l));
      }
      if (p.stock < 1) {
        flash(t['create.stockBlocked'].replace('{n}', String(p.stock)));
        return prev;
      }
      return [...prev, { productId: p.id, productName: p.name, stock: p.stock, qty: 1, price: p.sellingPrice }];
    });
  };

  const setQty = (productId: string, qty: number) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.productId !== productId) return l;
        const q = Math.max(1, Math.floor(qty) || 1);
        if (q > l.stock) {
          flash(t['create.stockBlocked'].replace('{n}', String(l.stock)));
          return l; // block qty > stock
        }
        return { ...l, qty: q };
      }),
    );
  };

  const setPrice = (productId: string, price: number) => {
    setLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, price: Math.max(0, price || 0) } : l)));
  };

  const removeLine = (productId: string) => {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  };

  const onLogoFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result || '');
      setLogoUrl(url);
      try {
        localStorage.setItem(LOGO_KEY, url);
      } catch {
        /* storage full — preview still works for this session */
      }
    };
    reader.readAsDataURL(file);
  };

  const payLabel = (m: string) => {
    if (m === 'bank') return t['pay.bank'];
    if (m === 'card') return t['pay.card'];
    if (m === 'mobile') return t['pay.mobile'];
    return t['pay.cash'];
  };

  const submit = async () => {
    if (submitting) return;
    if (!customerId) {
      flash(t['create.needCustomer']);
      return;
    }
    if (lines.length === 0) {
      flash(t['create.needItems']);
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post<{ invoice: any }>('/invoices', {
        customerId,
        date,
        items: lines.map((l) => ({ productId: l.productId, qty: l.qty, price: l.price })),
        discount: discountNum,
        paymentMethod,
        dueStatus,
        accentColor,
        notes: notes.trim(),
      });
      const newId = res.invoice?.id;
      if (newId) navigate(`/bills/${newId}`);
      else navigate('/bills');
    } catch {
      flash(t['create.createError']);
      setSubmitting(false);
    }
  };

  const docProps = {
    invoice: {
      invoiceNo: 'INV-····',
      date,
      discount: discountNum,
      paymentMethodLabel: payLabel(paymentMethod),
      dueStatus,
      dueStatusLabel: dueStatus === 'paid' ? t['create.paid'] : t['create.pending'],
      accentColor,
      notes: notes.trim(),
    },
    items: lines.map((l) => ({ productName: l.productName, qty: l.qty, price: l.price })),
    customer: {
      name: selectedCustomer?.name || '—',
      phone: selectedCustomer?.phone || '',
      address: selectedCustomer?.address,
    },
    shop: {
      name: user?.shopName ?? '',
      address: user?.shopAddress ?? '',
      logoUrl,
    },
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-5 md:pb-10">
      <h1 className="mb-4 text-2xl font-extrabold text-teal-950 dark:text-white">{t['create.title']}</h1>

      {loading ? (
        <div className="flex justify-center py-16 text-teal-800 dark:text-teal-200"><Spinner className="h-8 w-8" /></div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_minmax(0,520px)]">
          {/* ---------- Form column ---------- */}
          <div className="flex min-w-0 flex-col gap-4">
            {notice ? (
              <div className="rounded-xl bg-amber-100 dark:bg-amber-500/15 px-4 py-2.5 text-sm font-semibold text-amber-800 dark:text-amber-200" role="alert">
                {notice}
              </div>
            ) : null}

            <Card className="p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t['create.customer']}>
                  <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                    <option value="">{t['create.selectCustomer']}</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>
                    ))}
                  </Select>
                  {customers.length === 0 ? <p className="mt-1 text-xs text-slate-400">{t['create.noCustomers']}</p> : null}
                </Field>
                <Field label={t['create.date']}>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </Field>
              </div>
            </Card>

            <Card className="p-4">
              <h2 className="mb-2 text-base font-bold text-slate-800 dark:text-slate-100">{t['create.products']}</h2>
              <Input
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                placeholder={t['create.searchProducts']}
                className="mb-3"
                aria-label={t['create.searchProducts']}
              />
              {products.length === 0 ? (
                <EmptyState title={t['create.noProducts']} />
              ) : (
                <ul className="max-h-56 divide-y divide-slate-100 dark:divide-white/5 overflow-y-auto">
                  {filteredProducts.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{p.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {fmtMoney(p.sellingPrice)} · {p.stock} {t['create.stock']}
                        </p>
                      </div>
                      <Button size="sm" variant={p.stock > 0 ? 'primary' : 'ghost'} disabled={p.stock <= 0} onClick={() => addProduct(p)}>
                        {t['create.add']}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-4">
              <h2 className="mb-2 text-base font-bold text-slate-800 dark:text-slate-100">{t['create.lineItems']}</h2>
              {lines.length === 0 ? (
                <EmptyState title={t['create.noItems']} />
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-white/5">
                  {lines.map((l) => (
                    <li key={l.productId} className="py-3">
                      <div className="flex items-center gap-2">
                        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{l.productName}</p>
                        <button type="button" onClick={() => removeLine(l.productId)} className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline" aria-label={`${t['create.remove']} ${l.productName}`}>
                          {t['create.remove']}
                        </button>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        <Field label={t['create.qty']}>
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => setQty(l.productId, l.qty - 1)} disabled={l.qty <= 1}
                              className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-white/10 font-bold text-slate-700 dark:text-slate-200 disabled:opacity-40" aria-label="−">−</button>
                            <Input type="number" min={1} max={l.stock} value={l.qty} onChange={(e) => setQty(l.productId, Number(e.target.value))} className="text-center" aria-label={t['create.qty']} />
                            <button type="button" onClick={() => setQty(l.productId, l.qty + 1)}
                              className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-white/10 font-bold text-slate-700 dark:text-slate-200" aria-label="+">+</button>
                          </div>
                        </Field>
                        <Field label={t['create.price']}>
                          <Input type="number" min={0} value={l.price} onChange={(e) => setPrice(l.productId, Number(e.target.value))} />
                        </Field>
                        <div className="flex items-end justify-end pb-2">
                          <span className="text-sm font-extrabold tabular-nums text-slate-900 dark:text-white">{fmtMoney(l.qty * l.price)}</span>
                        </div>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">{l.stock} {t['create.stock']}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t['create.discount']}>
                  <Input type="number" min={0} value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" />
                </Field>
                <Field label={t['create.paymentMethod']}>
                  <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                    {PAY_METHODS.map((m) => (
                      <option key={m} value={m}>{payLabel(m)}</option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="mt-4">
                <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t['create.dueStatus']}</span>
                <SegmentedControl
                  options={[
                    { value: 'pending', label: t['create.pending'] },
                    { value: 'paid', label: t['create.paid'] },
                  ]}
                  value={dueStatus}
                  onChange={(v) => setDueStatus(v as DueStatus)}
                />
              </div>
              <div className="mt-4">
                <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t['create.accent']}</span>
                <div className="flex gap-2.5">
                  {ACCENTS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAccentColor(c)}
                      aria-label={c}
                      className={`h-9 w-9 rounded-full transition active:scale-90 ${accentColor === c ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-900' : 'ring-1 ring-black/10'}`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="mt-4">
                <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t['create.logo']}</span>
                <div className="flex items-center gap-3">
                  {logoUrl ? (
                    <img src={logoUrl} alt="" className="h-12 w-12 rounded-xl object-contain border border-slate-200 dark:border-white/10 bg-white" />
                  ) : null}
                  <label className="cursor-pointer">
                    <span className="inline-flex items-center rounded-xl border border-teal-900/15 dark:border-white/20 px-3.5 py-2 text-sm font-semibold text-teal-900 dark:text-teal-50 hover:bg-teal-900/5 dark:hover:bg-white/10">
                      {logoUrl ? t['create.changeLogo'] : t['create.uploadLogo']}
                    </span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => onLogoFile(e.target.files?.[0])} />
                  </label>
                </div>
              </div>
              <div className="mt-4">
                <Field label={t['create.notes']}>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t['create.notesPh']} />
                </Field>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                <span>{t['inv.subtotal']}</span><span className="font-bold tabular-nums">{fmtMoney(subtotal)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                <span>{t['create.discount']}</span><span className="font-bold tabular-nums">− {fmtMoney(discountNum)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-slate-100 dark:border-white/10 pt-2 text-lg font-extrabold text-slate-900 dark:text-white">
                <span>{t['inv.total']}</span><span className="tabular-nums">{fmtMoney(total)}</span>
              </div>
              <Button size="lg" className="mt-4 w-full" loading={submitting} onClick={submit}>
                {submitting ? t['create.creating'] : t['create.submit']}
              </Button>
            </Card>
          </div>

          {/* ---------- Live preview column ---------- */}
          <div className="min-w-0">
            <div className="lg:sticky lg:top-4">
              <h2 className="mb-2 text-base font-bold text-slate-800 dark:text-slate-100">{t['create.preview']}</h2>
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <InvoiceDoc {...docProps} />
                </div>
              </Card>
              <div className="mt-2 flex items-center justify-between px-1">
                <Badge variant="info">{dueStatus === 'paid' ? t['create.paid'] : t['create.pending']}</Badge>
                <span className="text-lg font-extrabold tabular-nums text-teal-900 dark:text-white">{fmtMoney(total)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
