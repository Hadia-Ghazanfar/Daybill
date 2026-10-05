import React, { Suspense, lazy, useMemo } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useLanguage } from './i18n';
import { AppShell } from './layout';
import Splash from './Splash';
import Welcome from './Welcome';
import Login from './Login';
import Register from './Register';
import NotFound from './NotFound';

/**
 * Feature pages live at these EXACT paths and are built by other agents.
 * The template-literal dynamic import keeps tsc happy while they don't exist
 * yet; Vite resolves them into code-split chunks once the files land.
 */
function lazyPage(name: string) {
  return lazy(
    () =>
      import(`./pages/${name}.tsx`) as Promise<{
        default: React.ComponentType;
      }>
  );
}

const FEATURE_PAGES = [
  'Dashboard',
  'Bills',
  'InvoiceDetail',
  'CreateInvoice',
  'Contacts',
  'ContactDetail',
  'Products',
  'NewPurchase',
  'Profile',
  'Feedback',
  'Admin',
] as const;

type FeaturePageName = (typeof FEATURE_PAGES)[number];

const pageCache = new Map<
  FeaturePageName,
  React.LazyExoticComponent<React.ComponentType>
>();

function getLazyPage(name: FeaturePageName) {
  let page = pageCache.get(name);
  if (!page) {
    page = lazyPage(name);
    pageCache.set(name, page);
  }
  return page;
}

function PageSpinner() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-100 border-t-brand dark:border-slate-800 dark:border-t-accent" />
    </div>
  );
}

function BootScreen() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-brand">
      <img
        src="/logo-white.png"
        alt="Daybill"
        className="w-36 animate-pulse-soft"
      />
    </div>
  );
}

class PageLoadBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return <PageLoadError onRetry={() => window.location.reload()} />;
    }
    return this.props.children;
  }
}

function PageLoadError({ onRetry }: { onRetry: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-slate-500 dark:text-slate-400">{t('common.building')}</p>
      <button
        onClick={onRetry}
        className="rounded-xl bg-brand px-6 py-2.5 font-semibold text-white"
      >
        {t('common.retry')}
      </button>
    </div>
  );
}

function LazyRoute({ name }: { name: FeaturePageName }) {
  const Page = useMemo(() => getLazyPage(name), [name]);
  return (
    <PageLoadBoundary>
      <Suspense fallback={<PageSpinner />}>
        <Page />
      </Suspense>
    </PageLoadBoundary>
  );
}

/** Redirects logged-in users to /dashboard (used for /welcome, /login, /register). */
function PublicOnly() {
  const { user, loading } = useAuth();
  if (loading) return <BootScreen />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

function RequireAuth() {
  const { user, loading } = useAuth();
  if (loading) return <BootScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function RequireAdmin() {
  const { user } = useAuth();
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Splash />} />

        <Route element={<PublicOnly />}>
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<LazyRoute name="Dashboard" />} />
            <Route path="/bills" element={<LazyRoute name="Bills" />} />
            <Route
              path="/bills/:id"
              element={<LazyRoute name="InvoiceDetail" />}
            />
            <Route path="/create" element={<LazyRoute name="CreateInvoice" />} />
            <Route path="/contacts" element={<LazyRoute name="Contacts" />} />
            <Route
              path="/contacts/:id"
              element={<LazyRoute name="ContactDetail" />}
            />
            <Route path="/products" element={<LazyRoute name="Products" />} />
            <Route
              path="/purchases/new"
              element={<LazyRoute name="NewPurchase" />}
            />
            <Route path="/profile" element={<LazyRoute name="Profile" />} />
            <Route
              path="/profile/feedback"
              element={<LazyRoute name="Feedback" />}
            />
            <Route element={<RequireAdmin />}>
              <Route path="/admin" element={<LazyRoute name="Admin" />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
