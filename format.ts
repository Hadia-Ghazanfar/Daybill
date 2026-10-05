export function fmtMoney(n: number | undefined | null): string {
  const v = Math.round(Number(n) || 0);
  return 'Rs ' + v.toLocaleString('en-PK');
}

export function fmtDateShort(iso: string | undefined | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso).slice(0, 10);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function fmtDateLong(iso: string | undefined | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso).slice(0, 10);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Sanitize a string for use as a download file name. */
export function safeFileName(name: string): string {
  return (name || 'invoice').replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 80);
}
