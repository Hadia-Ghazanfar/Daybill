import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n';

/** Teal-themed 404. */
export default function NotFound() {
  const { t } = useLanguage();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-brand px-6 text-center text-white">
      <img
        src="/assets/monster-404.png"
        alt=""
        className="w-52 max-w-[70vw] animate-fade-in"
      />
      <h1 className="mt-6 text-6xl font-extrabold tracking-tight">404</h1>
      <p className="mt-2 text-lg font-semibold">{t('notfound.title')}</p>
      <p className="mt-1 max-w-sm text-sm text-teal-100/80">
        {t('notfound.message')}
      </p>
      <Link
        to="/"
        className="mt-8 rounded-2xl bg-white px-8 py-3 font-semibold text-brand active:scale-[0.99]"
      >
        {t('notfound.home')}
      </Link>
    </div>
  );
}
