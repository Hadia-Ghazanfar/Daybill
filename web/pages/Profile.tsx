import { useNavigate } from 'react-router-dom';
import { Button, Card, SegmentedControl } from '../components/ui';
import { useState } from 'react';
import * as React from 'react';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api/client';
import { useLanguage } from '../i18n';
import { useTheme } from '../theme/ThemeContext';
import { toDisplay } from '../utils/phone';
import { avatarFor } from '../utils/avatar';

export default function Profile() {
  const { t, lang, setLang } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { user, logout, refresh } = useAuth();
  const [logoBusy, setLogoBusy] = useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) return;
    setLogoBusy(true);
    try {
      // Resize to max 256px and convert to base64
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const max = 256;
          let w = img.width, hh = img.height;
          if (w > max || hh > max) {
            const r = Math.min(max / w, max / hh);
            w = Math.round(w * r); hh = Math.round(hh * r);
          }
          canvas.width = w; canvas.height = hh;
          canvas.getContext('2d')?.drawImage(img, 0, 0, w, hh);
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(f);
      });
      await api.put('/auth/profile', { logoUrl: dataUrl });
      if (refresh) await refresh();
      else window.location.reload();
    } catch {
      // ignore
    } finally {
      setLogoBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }
  const navigate = useNavigate();

  const handleLogout = () => {
    try {
      logout();
    } finally {
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-4">
      <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t('profile.title')}</h1>

      {/* Shop info */}
      <Card className="mt-3 p-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
            title="Upload shop logo"
          >
            {user?.logoUrl ? (
              <img src={user.logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <img
                src={user ? avatarFor(user.id) : avatarFor('profile')}
                alt=""
                className="h-full w-full object-cover"
              />
            )}
            {logoBusy && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-xs">…</span>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoChange}
          />
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-slate-900 dark:text-white">
              {user?.shopName || user?.name || '—'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400" dir="ltr">
              {user?.phone ? toDisplay(user.phone) : '—'}
            </p>
          </div>
        </div>
        <dl className="mt-4 space-y-2.5 border-t border-slate-200 pt-3 dark:border-slate-700">
          <InfoRow label={t('profile.userName')} value={user?.name} />
          <InfoRow label={t('profile.shopName')} value={user?.shopName} />
          <InfoRow label={t('profile.shopAddress')} value={user?.shopAddress} />
          <InfoRow label={t('profile.phone')} value={user?.phone ? toDisplay(user.phone) : undefined} ltr />
        </dl>
      </Card>

      {/* Preferences */}
      <Card className="mt-3 space-y-4 p-4">
        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">{t('profile.language')}</p>
          <SegmentedControl
            value={lang}
            onChange={(v) => setLang(v as 'en' | 'ur')}
            options={[
              { value: 'en', label: t('profile.english') },
              { value: 'ur', label: t('profile.urdu') },
            ]}
          />
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">{t('profile.theme')}</p>
          <SegmentedControl
            value={theme}
            onChange={(v) => setTheme(v as 'light' | 'dark')}
            options={[
              { value: 'light', label: t('profile.light') },
              { value: 'dark', label: t('profile.dark') },
            ]}
          />
        </div>
      </Card>

      {/* Actions */}
      <div className="mt-3 space-y-2">
        <Card className="p-0">
          <button
            type="button"
            onClick={() => navigate('/profile/feedback')}
            className="flex w-full items-center justify-between p-4 text-start"
          >
            <span>
              <span className="block text-sm font-semibold text-slate-900 dark:text-white">{t('profile.feedback')}</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">{t('profile.feedbackHint')}</span>
            </span>
            <span className="text-slate-400 rtl:rotate-180" aria-hidden>
              →
            </span>
          </button>
        </Card>

        {user?.role === 'admin' && (
          <Card className="p-0">
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="flex w-full items-center justify-between p-4 text-start"
            >
              <span>
                <span className="block text-sm font-semibold text-slate-900 dark:text-white">{t('profile.adminPanel')}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">{t('profile.adminHint')}</span>
              </span>
              <span className="text-slate-400 rtl:rotate-180" aria-hidden>
                →
              </span>
            </button>
          </Card>
        )}

        <Button variant="danger" className="w-full" onClick={handleLogout}>
          {t('profile.logout')}
        </Button>
      </div>
    </div>
  );
}

function InfoRow({ label, value, ltr = false }: { label: string; value?: string; ltr?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-sm text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-end text-sm font-medium text-slate-900 dark:text-white" dir={ltr ? 'ltr' : undefined}>
        {value || '—'}
      </dd>
    </div>
  );
}
