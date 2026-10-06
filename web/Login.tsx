import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useLanguage } from './i18n';
import { toDisplay, isValidPhone } from './phone';
import { ApiError } from './client';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

function LoginCard() {
  const { t } = useLanguage();
  const { login, adminLogin } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'user' | 'admin'>('user');

  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const go = () => navigate('/dashboard', { replace: true });

  const submitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
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
      await login(phone, pin);
      go();
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? t('auth.invalidCreds')
          : t('common.error')
      );
    } finally {
      setBusy(false);
    }
  };

  const submitAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!EMAIL_RE.test(email.trim())) {
      setError(t('auth.emailInvalid'));
      return;
    }
    if (!password) {
      setError(t('auth.required'));
      return;
    }
    setBusy(true);
    try {
      await adminLogin(email.trim(), password);
      go();
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? t('auth.invalidAdminCreds')
          : t('common.error')
      );
    } finally {
      setBusy(false);
    }
  };

  return (
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
        {t('auth.loginTitle')}
      </h1>
      <p className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">
        {t('auth.loginSubtitle')}
      </p>

      {/* User / Admin toggle */}
      <div className="mt-6 grid grid-cols-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
        {(['user', 'admin'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={`rounded-xl py-2.5 text-sm font-semibold transition-colors ${
              mode === m
                ? 'bg-white text-brand shadow dark:bg-slate-900 dark:text-white'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {t(m === 'user' ? 'auth.user' : 'auth.admin')}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </p>
      )}

      {mode === 'user' ? (
        <>
        <form onSubmit={submitUser} className="mt-4 space-y-4" noValidate>
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
              {t('auth.pin')}
            </label>
            <input
              className={inputCls}
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
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
            {busy ? t('common.loading') : t('auth.login')}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="font-semibold text-accent-dark dark:text-accent-light">
            {t('auth.createNew')}
          </Link>
        </p>
        </>
      ) : (
        <form onSubmit={submitAdmin} className="mt-4 space-y-4" noValidate>
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              {t('auth.email')}
            </label>
            <input
              className={inputCls}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              {t('auth.password')}
            </label>
            <div className="relative">
              <input
                className={`${inputCls} pe-12`}
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400"
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-2xl bg-brand py-3.5 font-semibold text-white disabled:opacity-60"
          >
            {busy ? t('common.loading') : t('auth.login')}
          </button>
        </form>
      )}
    </div>
  );
}

/**
 * Mobile: the same login card, centered. Desktop (md+): split view — left
 * illustrated deep-teal panel + right side with the SAME login card.
 */
export default function Login() {
  const { t } = useLanguage();
  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950 md:grid md:grid-cols-2">
      {/* Left illustrated panel (desktop only) */}
      <div className="relative hidden flex-col overflow-hidden bg-brand md:flex">
        <img
          src="/logo-white.png"
          alt="Daybill"
          className="absolute start-8 top-8 h-9 w-auto"
        />
        <div className="flex flex-1 items-center justify-center px-12 pt-16">
          <img
            src="/desktop-shopkeeper-3d.png"
            alt=""
            className="w-full max-w-md"
          />
        </div>
        <div className="px-12 pb-12 text-white">
          <p className="text-xl font-bold">{t('app.tagline1')}</p>
          <p className="mt-1 text-sm text-teal-100/80">{t('app.tagline2')}</p>
        </div>
        {/* soft glow */}
        <div className="pointer-events-none absolute -end-24 -top-24 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -start-24 h-72 w-72 rounded-full bg-teal-300/10 blur-3xl" />
      </div>

      {/* Right: the login card (same component as mobile) */}
      <div className="flex items-center justify-center px-6 py-10">
        <LoginCard />
      </div>
    </div>
  );
}
