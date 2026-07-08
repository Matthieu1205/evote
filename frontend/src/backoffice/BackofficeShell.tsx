import { useState, useEffect, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOrgBranding } from '../hooks/useOrgBranding';

const BASE_URL = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3001';

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

const NAV: NavItem[] = [
  {
    href: '/backoffice',
    label: 'Tableau de bord',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: '/backoffice/membres',
    label: 'Membres',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: '/backoffice/scrutins',
    label: 'Scrutins',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    href: '/backoffice/candidatures',
    label: 'Candidatures',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
        <polyline points="16 11 17.5 12.5 21 9" />
      </svg>
    ),
  },
  {
    href: '/backoffice/conditions',
    label: 'Conditions',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <polyline points="9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    href: '/backoffice/audit',
    label: 'Journal d\'audit',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
];

export function BackofficeShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  useOrgBranding(user?.organization.primaryColor);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  function isActive(href: string) {
    if (href === '/backoffice') return location.pathname === '/backoffice';
    return location.pathname.startsWith(href);
  }

  const initials = user?.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? 'AD';

  const avatarUrl = user?.photoUrl
    ? user.photoUrl.startsWith('http') ? user.photoUrl : `${BASE_URL}${user.photoUrl}`
    : null;

  const Sidebar = (
    <div className="flex h-full flex-col" style={{ background: 'linear-gradient(180deg, #064e3b 0%, #052e24 100%)' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        {user?.organization.logoUrl ? (
          <img src={user.organization.logoUrl} alt={user.organization.name} className="h-9 w-auto" />
        ) : (
          <img src="/logo-evote.svg" alt="eVote" className="h-9 w-auto brightness-0 invert" />
        )}
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-white/60">Backoffice</p>
          <p className="truncate text-sm font-bold text-white">{user?.organization.name ?? 'Administration'}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {NAV.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
              isActive(item.href)
                ? 'bg-white/15 text-white shadow-sm'
                : 'text-white/60 hover:bg-white/8 hover:text-white'
            }`}
          >
            <span className={isActive(item.href) ? 'text-emerald-300' : 'text-white/40'}>
              {item.icon}
            </span>
            {item.label}
            {isActive(item.href) && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" />
            )}
          </Link>
        ))}
      </nav>

      {/* Séparateur + lien vers l'app */}
      <div className="px-3 pb-2">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium text-white/40 transition hover:bg-white/8 hover:text-white/70"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Retour à l'application
        </Link>
      </div>

      {/* User footer */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-emerald-500/20">
            {avatarUrl ? (
              <img src={avatarUrl} alt={user?.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-bold text-emerald-300">
                {initials}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
            <p className="truncate text-xs text-white/40">Administrateur</p>
          </div>
          <button
            type="button"
            title="Déconnexion"
            onClick={handleLogout}
            className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar desktop */}
      <aside className="hidden w-72 shrink-0 lg:block">
        <div className="sticky top-0 h-screen">
          {Sidebar}
        </div>
      </aside>

      {/* Backdrop mobile */}
      <div
        onClick={() => setMobileOpen(false)}
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Drawer mobile */}
      <aside
        className={`fixed left-0 top-0 z-50 h-full w-72 transition-transform duration-300 lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {Sidebar}
      </aside>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile topbar */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <img src="/logo-evote.svg" alt="eVote" className="h-8 w-auto" style={{ filter: 'brightness(0) saturate(100%) invert(39%) sepia(88%) saturate(500%) hue-rotate(124deg)' }} />
          <div className="w-9" />
        </header>

        <main className="flex-1 p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
