/** Shared Feature-A types. API returns camelCase (per contract's user-shape convention). */

export interface Customer {
  id: string;
  name: string;
  phone: string; // display format 0300-0000000
  address?: string;
  totalBilled?: number;
  invoiceCount?: number;
  lastTransaction?: string;
}

export interface Product {
  id: string;
  name: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
}

export type DueStatus = 'paid' | 'pending';

export interface InvoiceItemView {
  id?: string;
  productId: string;
  productName: string;
  qty: number;
  price: number;
}

export interface Invoice {
  id: string;
  customerId: string;
  invoiceNo: string;
  date: string;
  discount: number;
  paymentMethod: string;
  dueStatus: DueStatus;
  accentColor?: string;
  notes?: string;
  total?: number;
  createdAt?: string;
  customerName?: string;
}

/** Tolerate snake_case too, in case a handler returns raw row fields. */
export function normalizeInvoice(raw: any): Invoice {
  return {
    id: String(raw.id ?? ''),
    customerId: String(raw.customerId ?? raw.customer_id ?? ''),
    invoiceNo: String(raw.invoiceNo ?? raw.invoice_no ?? ''),
    date: String(raw.date ?? ''),
    discount: Number(raw.discount ?? 0),
    paymentMethod: String(raw.paymentMethod ?? raw.payment_method ?? 'cash'),
    dueStatus: (raw.dueStatus ?? raw.due_status ?? 'pending') === 'paid' ? 'paid' : 'pending',
    accentColor: raw.accentColor ?? raw.accent_color,
    notes: raw.notes ?? '',
    total: raw.total != null ? Number(raw.total) : undefined,
    createdAt: raw.createdAt ?? raw.created_at,
    customerName: raw.customerName ?? raw.customer_name,
  };
}

export function normalizeInvoiceItem(raw: any): InvoiceItemView {
  return {
    id: raw.id != null ? String(raw.id) : undefined,
    productId: String(raw.productId ?? raw.product_id ?? ''),
    productName: String(raw.productName ?? raw.product_name ?? raw.name ?? ''),
    qty: Number(raw.qty ?? 0),
    price: Number(raw.price ?? 0),
  };
}

export function invoiceTotal(inv: Pick<Invoice, 'discount'>, items: Pick<InvoiceItemView, 'qty' | 'price'>[]): number {
  const sub = items.reduce((s, it) => s + it.qty * it.price, 0);
  const disc = Math.min(Math.max(Number(inv.discount) || 0, 0), sub);
  return sub - disc;
}

export interface Purchase {
  id: string;
  supplierName: string;
  type: 'purchase_order' | 'delivered_purchase';
  delivered: boolean;
  date: string;
  total: number;
  itemCount: number;
}

export function normalizePurchase(raw: any): Purchase {
  const deliveredRaw = raw.delivered;
  return {
    id: String(raw.id ?? ''),
    supplierName: String(raw.supplierName ?? raw.supplier_name ?? ''),
    type: raw.type === 'delivered_purchase' ? 'delivered_purchase' : 'purchase_order',
    delivered: deliveredRaw === true || deliveredRaw === 1 || deliveredRaw === '1',
    date: String(raw.date ?? ''),
    total: Number(raw.total ?? 0),
    itemCount: Number(raw.itemCount ?? raw.item_count ?? 0),
  };
}

export interface ActivityItem {
  id: string;
  kind?: string;
  title: string;
  subtitle?: string;
  amount?: number;
  date?: string;
}

export interface DashboardData {
  revenue: number;
  cost: number;
  profit: number;
  customerDues: number;
  supplierPayables: number;
  received: number;
  series: { date: string; revenue: number }[];
  recentActivity: ActivityItem[];
}

export interface InvoiceSummary {
  total: number;
  paid: number;
  pending: number;
}
