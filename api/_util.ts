import { HttpError, AuthUser } from "./_auth";

// Phone display: 0300-0000000 ; storage: digits only (03001234567)
export function toDisplay(digits: string | null | undefined): string | null {
  if (!digits) return null;
  const d = String(digits).replace(/\D/g, "");
  if (d.length !== 11 || !d.startsWith("03")) return String(digits);
  return `${d.slice(0, 4)}-${d.slice(4)}`;
}

export function toDigits(input: string | null | undefined): string | null {
  if (!input) return null;
  const d = String(input).replace(/\D/g, "");
  return d || null;
}

export const PHONE_RE = /^03\d{2}-\d{7}$/;
export function isValidDisplayPhone(phone: string | null | undefined): boolean {
  return !!phone && PHONE_RE.test(String(phone).trim());
}

/** Lenient phone parser: accepts display "0300-0000000" or raw "03001234567".
 *  Returns digits-only. Throws 400 on invalid. */
export function parsePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const s = String(input).trim();
  if (PHONE_RE.test(s)) return toDigits(s);
  const d = s.replace(/\D/g, "");
  if (/^03\d{9}$/.test(d)) return d;
  throw new HttpError(400, "phone must be in 0300-0000000 format");
}

/** Public user shape — NEVER includes pin_hash / password_hash. */
export function userShape(row: any) {
  return {
    id: row.id,
    name: row.name ?? null,
    phone: toDisplay(row.phone),
    shopName: row.shop_name ?? null,
    shopAddress: row.shop_address ?? null,
    email: row.email ?? null,
    role: row.role || "user",
    createdAt: row.created_at,
  };
}

export function newId(): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require("crypto");
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Wrap a handler so HttpError → proper status JSON; unexpected → 500. */
export function wrap(
  handler: (req: any, res: any) => Promise<void>
): (req: any, res: any) => Promise<void> {
  return async (req: any, res: any) => {
    try {
      await handler(req, res);
    } catch (err: any) {
      if (err instanceof HttpError) {
        res.status(err.status).json({ error: err.message });
      } else {
        console.error("API error:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  };
}

export function contactShape(row: any) {
  return {
    id: row.id,
    name: row.name ?? null,
    phone: toDisplay(row.phone),
    address: row.address ?? null,
    createdAt: row.created_at,
  };
}

export function productShape(row: any) {
  return {
    id: row.id,
    name: row.name ?? null,
    costPrice: row.cost_price ?? 0,
    sellingPrice: row.selling_price ?? 0,
    stock: row.stock ?? 0,
    createdAt: row.created_at,
  };
}

export function invoiceTotal(items: { qty: number; price: number }[], discount: number): number {
  const subtotal = items.reduce((s, it) => s + Number(it.qty) * Number(it.price), 0);
  return Math.max(0, subtotal - (Number(discount) || 0));
}

export type { AuthUser };
