import React from 'react';
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

import Dashboard from './Dashboard';
import Bills from './Bills';
import InvoiceDetail from './InvoiceDetail';
import CreateInvoice from './CreateInvoice';
import Contacts from './Contacts';
import ContactDetail from './ContactDetail';
import Products from './Products';
import NewPurchase from './NewPurchase';
import Profile from './Profile';
import Feedback from './Feedback';
import Admin from './Admin';

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

const PAGE_COMPONENTS: Record<FeaturePageName, React.ComponentType> = {
  Dashboard,
  Bills,
  InvoiceDetail,
  CreateInvoice,
  Contacts,
  ContactDetail,
  Products,
  NewPurchase,
  Profile,
  Feedback,
  Admin,
};

function getLazyPage(name: FeaturePageName) {
  return PAGE_COMPONENTS[name];
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
  const Page = getLazyPage(name);
  return (
    <PageLoadBoundary>
      <Page />
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
