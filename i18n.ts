import { useEffect, useState } from 'react';
import en from '../i18n/featA.en';
import ur from '../i18n/featA.ur';

export type FeatAStrings = typeof en;

function currentLang(): 'en' | 'ur' {
  try {
    return localStorage.getItem('daybill-lang') === 'ur' ? 'ur' : 'en';
  } catch {
    return 'en';
  }
}

/**
 * Feature-A string hook. Reads the persisted `daybill-lang` key and re-reads it
 * whenever the app language changes (observes <html lang/dir> mutations, which the
 * shell LanguageContext updates, plus storage + custom events).
 * Missing Urdu keys fall back to English.
 */
export function useStrings(): FeatAStrings {
  const [lang, setLang] = useState<'en' | 'ur'>(currentLang);

  useEffect(() => {
    const check = () => setLang(currentLang());
    let mo: MutationObserver | null = null;
    if (typeof document !== 'undefined' && typeof MutationObserver !== 'undefined') {
      mo = new MutationObserver(check);
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ['lang', 'dir'] });
    }
    window.addEventListener('storage', check);
    window.addEventListener('daybill:lang', check);
    return () => {
      mo?.disconnect();
      window.removeEventListener('storage', check);
      window.removeEventListener('daybill:lang', check);
    };
  }, []);

  if (lang === 'ur') return { ...en, ...ur } as unknown as FeatAStrings;
  return en;
}
