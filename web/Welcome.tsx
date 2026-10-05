import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Login from './Login';
import { useLanguage } from './i18n';

const SLIDES = [
  { img: '/welcome-shopkeeper.png', captionKey: 'welcome.slide1' },
  { img: '/welcome-billing.png', captionKey: 'welcome.slide2' },
  { img: '/welcome-sharing.png', captionKey: 'welcome.slide3' },
] as const;

function MobileWelcome() {
  const { t } = useLanguage();
  const [index, setIndex] = useState(0);
  const touchX = useRef<number | null>(null);

  const go = (i: number) =>
    setIndex(Math.max(0, Math.min(SLIDES.length - 1, i)));

  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (dx < -40) go(index + 1);
    else if (dx > 40) go(index - 1);
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center px-6 pb-10 pt-10">
      {/* Logo */}
      <img
        src="/logo-dark.png"
        alt="Daybill"
        className="h-9 w-auto dark:hidden"
      />
      <img
        src="/logo-white.png"
        alt="Daybill"
        className="hidden h-9 w-auto dark:block"
      />

      {/* Illustration (swipeable) */}
      <div
        className="flex w-full flex-1 items-center justify-center py-6"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div key={index} className="animate-fade-in text-center">
          <img
            src={SLIDES[index].img}
            alt=""
            className="mx-auto max-h-64 w-auto"
            draggable={false}
          />
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            {t(SLIDES[index].captionKey)}
          </p>
        </div>
      </div>

      {/* Heading */}
      <h1 className="text-center text-2xl font-bold">{t('welcome.title')}</h1>

      {/* Tagline */}
      <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
        {t('app.tagline1')}
        <span className="mx-1.5 text-slate-300 dark:text-slate-600">•</span>
        {t('app.tagline2')}
      </p>

      {/* Dots */}
      <div className="mt-4 flex items-center gap-2">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => go(i)}
            aria-label={`Slide ${i + 1}`}
            className={`h-2 rounded-full transition-all ${
              i === index ? 'w-6 bg-accent' : 'w-2 bg-slate-300 dark:bg-slate-700'
            }`}
          />
        ))}
      </div>

      {/* CTA */}
      <Link
        to="/login"
        className="mt-6 w-full rounded-2xl bg-brand py-3.5 text-center font-semibold text-white active:scale-[0.99]"
      >
        {t('welcome.cta')}
      </Link>

      {/* Signup */}
      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
        {t('welcome.noAccount')}{' '}
        <Link to="/register" className="font-semibold text-accent-dark dark:text-accent">
          {t('welcome.signup')}
        </Link>
      </p>
    </div>
  );
}

/**
 * Mobile: 3-slide welcome carousel. Desktop (md+): the split login showcase
 * (shares Login's desktop layout — just render <Login/>).
 */
export default function Welcome() {
  return (
    <>
      <div className="md:hidden">
        <MobileWelcome />
      </div>
      <div className="hidden md:block">
        <Login />
      </div>
    </>
  );
}
