/**
 * Deterministic avatar — per CONTRACT.md.
 * avatarFor(id) hashes the id's chars → index 0..11 → /assets/avatars/avatar-01..12.png.
 * Same id ⇒ same avatar EVERYWHERE (contacts, admin accounts, feedback senders).
 */
export function avatarFor(id: string | null | undefined): string {
  const s = String(id ?? '');
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(h, 31) + s.charCodeAt(i)) >>> 0;
  }
  const n = (h % 12) + 1;
  return `/assets/avatars/avatar-${String(n).padStart(2, '0')}.png`;
}
