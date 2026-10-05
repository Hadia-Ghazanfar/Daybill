import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  PlusCircle,
  Users,
  Package,
  User,
  ShoppingBag,
  ShieldCheck,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useLanguage } from './i18n';

interface NavItem {
  to: string;
  key: string;
  icon: LucideIcon;
}

/** Mobile bottom nav: exact original tab order. */
const MOBILE_TABS: NavItem[] = [
  { to: '/dashboard', key: 'nav.overview', icon: LayoutDashboard },
  { to: '/bills', key: 'nav.bills', icon: Receipt },
  { to: '/create', key: 'nav.create', icon: PlusCircle },
  { to: '/contacts', key: 'nav.contacts', icon: Users },
  { to: '/products', key: 'nav.products', icon: Package },
  { to: '/profile', key: 'nav.profile', icon: User },
];

function MobileNav() {
  const { t } = useLanguage();
  return (
    <nav
      className="fixed inset-x-4 bottom-4 z-40 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-6 rounded-3xl border border-slate-200 bg-white/95 px-1 py-2 shadow-2xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        {MOBILE_TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-medium transition-colors ${
                isActive
                  ? 'text-accent-dark dark:text-accent'
                  : 'text-slate-400 dark:text-slate-500'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <tab.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                <span className={isActive ? 'font-semibold' : ''}>
                  {t(tab.key)}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function DesktopSidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const groups: { label: string; items: NavItem[] }[] = [
    {
      label: t('nav.overview'),
      items: [{ to: '/dashboard', key: 'nav.overview', icon: LayoutDashboard }],
    },
    {
      label: t('nav.sales'),
      items: [
        { to: '/bills', key: 'nav.bills', icon: Receipt },
        { to: '/create', key: 'nav.createInvoice', icon: PlusCircle },
      ],
    },
    {
      label: t('nav.catalog'),
      items: [
        { to: '/contacts', key: 'nav.contacts', icon: Users },
        { to: '/products', key: 'nav.products', icon: Package },
        { to: '/bills', key: 'nav.purchases', icon: ShoppingBag },
      ],
    },
    {
      label: t('nav.account'),
      items: [
        { to: '/profile', key: 'nav.profile', icon: User },
        ...(user?.role === 'admin'
          ? [{ to: '/admin', key: 'nav.admin', icon: ShieldCheck } as NavItem]
          : []),
      ],
    },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside
      className={`fixed inset-y-0 start-0 z-40 hidden flex-col bg-brand text-white transition-all duration-200 md:flex ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand row */}
      <div
        className={`flex items-center gap-3 px-4 pt-6 pb-2 ${
          collapsed ? 'justify-center px-2' : ''
        }`}
      >
        {!collapsed && (
          <img src="/logo-white.png" alt="Daybill" className="h-8 w-auto" />
        )}
        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`rounded-lg p-2 text-teal-100/70 transition-colors hover:bg-white/10 hover:text-white ${
            collapsed ? '' : 'ms-auto'
          }`}
        >
          {collapsed ? <ChevronsRight size={20} /> : <ChevronsLeft size={20} />}
        </button>
      </div>
      {collapsed && (
        <div className="flex justify-center pb-2">
          <img src="/logo-white.png" alt="Daybill" className="h-7 w-auto" />
        </div>
      )}

      {/* Groups */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {groups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-teal-100/50">
                {group.label}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.to + item.key}
                  to={item.to}
                  title={collapsed ? t(item.key) : undefined}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                      collapsed ? 'justify-center px-2' : ''
                    } ${
                      isActive
                        ? 'bg-white/15 font-semibold text-white'
                        : 'text-teal-100/70 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <item.icon size={20} shrink-0={1} />
                  {!collapsed && <span>{t(item.key)}</span>}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="border-t border-white/10 p-3">
        <button
          onClick={handleLogout}
          title={collapsed ? t('nav.logout') : undefined}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-teal-100/70 transition-colors hover:bg-white/10 hover:text-white ${
            collapsed ? 'justify-center px-2' : ''
          }`}
        >
          <LogOut size={20} />
          {!collapsed && <span>{t('nav.logout')}</span>}
        </button>
      </div>
    </aside>
  );
}

/**
 * Authenticated app shell.
 * Mobile (<md): floating rounded bottom nav, 6 tabs.
 * Desktop (md+): dark-teal sidebar (expanded groups, collapsible to icon rail).
 */
export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-dvh bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <DesktopSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
      />

      <div
        className={`transition-all duration-200 ${
          collapsed ? 'md:ps-20' : 'md:ps-64'
        }`}
      >
        <main className="mx-auto w-full max-w-6xl px-4 pb-32 pt-6 md:px-8 md:pb-12 md:pt-8">
          <Outlet />
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
