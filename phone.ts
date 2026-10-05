/**
 * Phone helpers — per CONTRACT.md conventions.
 * Storage: digits only ("03001234567"). Display: "0300-0000000" everywhere.
 */

/** Strip everything except digits. */
export function toDigits(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '');
}

/** Format as 0300-0000000 (4 digits, dash, 7 digits). Idempotent. */
export function toDisplay(value: string | null | undefined): string {
  const d = toDigits(value).slice(0, 11);
  if (d.length <= 4) return d;
  return `${d.slice(0, 4)}-${d.slice(4)}`;
}

/** Validate display/storage input against /^03\d{2}-\d{7}$/ (after normalising). */
export function isValidPhone(value: string | null | undefined): boolean {
  return /^03\d{2}-\d{7}$/.test(toDisplay(value));
}

/** Convert to international WhatsApp format: "92" + digits.slice(1), e.g. 923001234567. */
export function toWhatsApp(value: string | null | undefined): string {
  return '92' + toDigits(value).slice(1);
}
