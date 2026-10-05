import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useLanguage } from './i18n';
import { toDisplay, isValidPhone } from './phone';
import { ApiError } from './client';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

/** name, phone (0300-0000000), shop name, shop address, 4-digit PIN → auto-login → /dashboard. */
export default function Register() {
  const { t } = useLanguage();
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [shopName, setShopName] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !shopName.trim() || !shopAddress.trim()) {
      setError(t('auth.required'));
      return;
    }
    if (!isValidPhone(phone)) {
      setError(t('auth.phoneInvalid'));
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setError(t('auth.pinInvalid'));
      return;
    }
    setBusy(true);
    try {
      await register({
        name: name.trim(),
        phone,
        shopName: shopName.trim(),
        shopAddress: shopAddress.trim(),
        pin,
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t('common.error')
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-6 py-10 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        <img
          src="/logo-dark.png"
          alt="Daybill"
          className="mx-auto h-10 w-auto dark:hidden"
        />
        <img
          src="/logo-white.png"
          alt="Daybill"
          className="mx-auto hidden h-10 w-auto dark:block"
        />

        <h1 className="mt-6 text-center text-2xl font-bold">
          {t('register.title')}
        </h1>
        <p className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">
          {t('register.subtitle')}
        </p>

        {error && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </p>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              {t('register.name')}
            </label>
            <input
              className={inputCls}
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              {t('auth.phone')}
            </label>
            <input
              className={inputCls}
              inputMode="numeric"
              autoComplete="tel"
              placeholder="0300-0000000"
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(toDisplay(e.target.value))}
              maxLength={12}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              {t('register.shopName')}
            </label>
            <input
              className={inputCls}
              autoComplete="organization"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              {t('register.shopAddress')}
            </label>
            <input
              className={inputCls}
              autoComplete="street-address"
              value={shopAddress}
              onChange={(e) => setShopAddress(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              {t('auth.pin')}
            </label>
            <input
              className={inputCls}
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              placeholder="••••"
              dir="ltr"
              value={pin}
              onChange={(e) =>
                setPin(e.target.value.replace(/\D/g, '').slice(0, 4))
              }
              maxLength={4}
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-2xl bg-brand py-3.5 font-semibold text-white disabled:opacity-60"
          >
            {busy ? t('common.loading') : t('register.submit')}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
          {t('register.haveAccount')}{' '}
          <Link
            to="/login"
            className="font-semibold text-accent-dark dark:text-accent"
          >
            {t('register.login')}
          </Link>
        </p>
      </div>
    </div>
  );
}
