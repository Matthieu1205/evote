import { useState, useEffect, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from './Logo';
import { ROLE_LABELS } from '../lib/rbac';
import { useOrgBranding } from '../hooks/useOrgBranding';

const BASE_URL = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3001';

interface NavItem {
  href: string;
  label: string;
  roles: string[];
}

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Tableau de bord', roles: ['ELECTEUR', 'CANDIDAT', 'COMMISSION', 'ADMIN', 'OBSERVATEUR'] },
  { href: '/vote', label: 'Voter', roles: ['ELECTEUR', 'CANDIDAT', 'COMMISSION', 'ADMIN'] },
  { href: '/candidatures', label: 'Candidatures', roles: ['ELECTEUR', 'CANDIDAT'] },
  { href: '/admin/membres', label: 'Membres', roles: ['ADMIN'] },
  { href: '/admin/scrutins', label: 'Scrutins', roles: ['COMMISSION', 'ADMIN'] },
  { href: '/admin/candidatures', label: 'Validation', roles: ['COMMISSION', 'ADMIN'] },
  { href: '/audit', label: 'Audit', roles: ['ADMIN', 'OBSERVATEUR', 'COMMISSION'] },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  useOrgBranding(user?.organization.primaryColor);
  const role = user?.role ?? '';
  const items = NAV.filter((i) => role && i.roles.includes(role));
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const initials = user?.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() ?? '?';
  const avatarUrl = user?.photoUrl
    ? user.photoUrl.startsWith('http') ? user.photoUrl : `${BASE_URL}${user.photoUrl}`
    : null;

  function isActive(href: string) {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center px-4 py-3 sm:px-6">
          {/* Logo */}
          <Link to="/dashboard" className="shrink-0">
            <Logo
              src={user?.organization.logoUrl ?? undefined}
              alt={user?.organization.name}
              className={
                user?.organization.logoUrl
                  ? ''
                  : '[&_img]:[filter:brightness(0)_saturate(100%)_invert(39%)_sepia(88%)_saturate(500%)_hue-rotate(124deg)]'
              }
            />
          </Link>

          {/* Nav desktop — centrée */}
          <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
            {items.map((i) => (
              <Link
                key={i.href}
                to={i.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive(i.href)
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
                }`}
              >
                {i.label}
              </Link>
            ))}
          </nav>

          {/* Droite */}
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            {user && (
              <Link to="/profil" className="hidden items-center gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-ink-50 sm:flex">
                <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-brand-100">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-bold text-brand-600">
                      {initials}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-ink-900">{user.name}</div>
                  <div className="text-[11px] text-ink-400">
                    {ROLE_LABELS[role]} · {user.ordreNumber}
                  </div>
                </div>
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="btn-ghost hidden px-3 py-2 lg:inline-flex"
            >
              Déconnexion
            </button>

            {/* Hamburger mobile */}
            <button
              type="button"
              aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
              onClick={() => setOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200 text-ink-600 transition hover:bg-ink-50 lg:hidden"
            >
              {open ? (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Backdrop mobile */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-ink-900/40 backdrop-blur-sm transition-opacity lg:hidden ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Drawer mobile */}
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-2xl transition-transform duration-300 lg:hidden ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <Logo
            src={user?.organization.logoUrl ?? undefined}
            alt={user?.organization.name}
            className={
              user?.organization.logoUrl
                ? ''
                : '[&_img]:[filter:brightness(0)_saturate(100%)_invert(39%)_sepia(88%)_saturate(500%)_hue-rotate(124deg)]'
            }
          />
          <button
            type="button"
            aria-label="Fermer"
            onClick={() => setOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 hover:bg-ink-100"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {user && (
          <div className="flex items-center gap-3 border-b border-ink-100 px-5 py-4">
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-brand-100">
              {avatarUrl ? (
                <img src={avatarUrl} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-bold text-brand-600">
                  {initials}
                </div>
              )}
            </div>
            <div>
              <p className="font-semibold text-ink-900">{user.name}</p>
              <p className="text-xs text-ink-400">
                {ROLE_LABELS[role]} · {user.ordreNumber}
              </p>
            </div>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {items.map((i) => (
            <Link
              key={i.href}
              to={i.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                isActive(i.href)
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
              }`}
            >
              {i.label}
              {isActive(i.href) && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-500" />
              )}
            </Link>
          ))}
        </nav>

        <div className="border-t border-ink-100 p-4 space-y-1">
          <Link
            to="/profil"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-ink-600 transition hover:bg-ink-50 hover:text-ink-900"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
            Mon profil
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Déconnexion
          </button>
        </div>
      </aside>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
