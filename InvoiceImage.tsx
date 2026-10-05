import { forwardRef } from 'react';
import { fmtMoney, fmtDateLong } from '../utils/format';

/**
 * Offscreen invoice renderer — used ONLY for PNG export.
 * White card, the SHOP's own branding only (name/address/logo, accent colour).
 * NO Daybill branding anywhere.
 */

export interface InvoiceDocInvoice {
  invoiceNo: string;
  date: string;
  discount: number;
  paymentMethodLabel: string;
  dueStatus: 'paid' | 'pending';
  dueStatusLabel: string;
  accentColor?: string;
  notes?: string;
}

export interface InvoiceDocItem {
  productName: string;
  qty: number;
  price: number;
}

export interface InvoiceDocCustomer {
  name: string;
  phone: string;
  address?: string;
}

export interface InvoiceDocShop {
  name: string;
  address?: string;
  logoUrl?: string;
}

export interface InvoiceDocProps {
  invoice: InvoiceDocInvoice;
  items: InvoiceDocItem[];
  customer: InvoiceDocCustomer;
  shop: InvoiceDocShop;
}

const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

/** The invoice document itself (fixed 800px wide). Rendered visibly for preview
 *  and offscreen via <InvoiceImage> for PNG export. */
export function InvoiceDoc({ invoice, items, customer, shop }: InvoiceDocProps) {
  const accent = invoice.accentColor || '#0B3B39';
  const subtotal = items.reduce((s, it) => s + it.qty * it.price, 0);
  const discount = Math.min(Math.max(invoice.discount || 0, 0), subtotal);
  const total = subtotal - discount;
  const paid = invoice.dueStatus === 'paid';

  return (
    <div style={{ width: 800, background: '#ffffff', color: '#1f2937', fontFamily: FONT }}>
      <div style={{ height: 12, background: accent }} />
      <div style={{ padding: '40px 44px' }}>
        {/* Header: shop branding (left) + INVOICE meta (right) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {shop.logoUrl ? (
              <img src={shop.logoUrl} alt="" style={{ width: 72, height: 72, objectFit: 'contain', borderRadius: 12 }} />
            ) : (
              <div
                style={{
                  width: 72, height: 72, borderRadius: 16, background: accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#ffffff', fontSize: 32, fontWeight: 800,
                }}
              >
                {(shop.name || 'S').charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#111827' }}>{shop.name}</div>
              {shop.address ? <div style={{ fontSize: 14, color: '#6b7280', marginTop: 4, maxWidth: 360 }}>{shop.address}</div> : null}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 2, color: accent }}>INVOICE</div>
            <div style={{ fontSize: 14, color: '#6b7280', marginTop: 8 }}>
              <span style={{ fontWeight: 700, color: '#374151' }}>{invoice.invoiceNo}</span>
            </div>
            <div style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>{fmtDateLong(invoice.date)}</div>
          </div>
        </div>

        {/* Bill-to + payment meta */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginTop: 32 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: '#9ca3af', textTransform: 'uppercase' }}>Bill to</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginTop: 6 }}>{customer.name}</div>
            <div style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>{customer.phone}</div>
            {customer.address ? <div style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>{customer.address}</div> : null}
          </div>
          <div style={{ textAlign: 'right', fontSize: 14 }}>
            <div style={{ color: '#6b7280' }}>
              Payment: <span style={{ fontWeight: 700, color: '#374151' }}>{invoice.paymentMethodLabel}</span>
            </div>
            <div style={{ marginTop: 8 }}>
              <span
                style={{
                  display: 'inline-block', padding: '6px 18px', borderRadius: 999,
                  fontWeight: 800, fontSize: 14,
                  background: paid ? '#d1fae5' : '#fef3c7',
                  color: paid ? '#065f46' : '#92400e',
                }}
              >
                {invoice.dueStatusLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Line items */}
        <table style={{ width: '100%', marginTop: 28, borderCollapse: 'collapse', fontSize: 15 }}>
          <thead>
            <tr style={{ background: accent, color: '#ffffff', textAlign: 'left' }}>
              <th style={{ padding: '12px 16px', borderRadius: '8px 0 0 8px', width: 48 }}>#</th>
              <th style={{ padding: '12px 16px' }}>Item</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', width: 90 }}>Qty</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', width: 130 }}>Price</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', width: 150, borderRadius: '0 8px 8px 0' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 16px', color: '#9ca3af' }}>{i + 1}</td>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827' }}>{it.productName}</td>
                <td style={{ padding: '12px 16px', textAlign: 'center', color: '#4b5563' }}>{it.qty}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', color: '#4b5563' }}>{fmtMoney(it.price)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#111827' }}>{fmtMoney(it.qty * it.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
          <div style={{ width: 300, fontSize: 15 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', color: '#4b5563' }}>
              <span>Subtotal</span><span style={{ fontWeight: 600 }}>{fmtMoney(subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', color: '#4b5563' }}>
              <span>Discount</span><span style={{ fontWeight: 600 }}>− {fmtMoney(discount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', marginTop: 8, background: accent, color: '#ffffff', borderRadius: 10, fontSize: 18, fontWeight: 800 }}>
              <span>Total</span><span>{fmtMoney(total)}</span>
            </div>
          </div>
        </div>

        {invoice.notes ? (
          <div style={{ marginTop: 24, fontSize: 14, color: '#6b7280' }}>
            <span style={{ fontWeight: 700, color: '#374151' }}>Notes: </span>{invoice.notes}
          </div>
        ) : null}

        <div style={{ marginTop: 36, paddingTop: 20, borderTop: '2px solid #f3f4f6', textAlign: 'center', fontSize: 14, color: '#9ca3af' }}>
          Thank you for your business!
        </div>
      </div>
      <div style={{ height: 12, background: accent }} />
    </div>
  );
}

export interface InvoiceImageProps extends InvoiceDocProps {}

/** Offscreen wrapper used ONLY for PNG export. Keep mounted while sharing. */
export const InvoiceImage = forwardRef<HTMLDivElement, InvoiceImageProps>(function InvoiceImage(props, ref) {
  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{ position: 'fixed', left: -12000, top: 0, width: 800, pointerEvents: 'none', zIndex: -1 }}
    >
      <InvoiceDoc {...props} />
    </div>
  );
});
