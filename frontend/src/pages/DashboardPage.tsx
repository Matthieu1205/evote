import { useEffect, useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { DashboardCharts } from '../components/DashboardCharts';
import { LiveResultsWidget } from '../components/LiveResultsWidget';
import { useAuth } from '../contexts/AuthContext';
import { ROLE_LABELS } from '../lib/rbac';
import { api } from '../lib/api';

interface Election {
  id: string;
  title: string;
  status: string;
  _count: { positions: number; voteRecords: number };
}

interface DashboardStats {
  openCount: number;
  memberCount: number;
  myVotes: number;
  totalElections: number;
  elections: Election[];
}

interface ActivityItem {
  id: string;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  createdAt: string;
  ip?: string | null;
  actor?: { firstName: string; lastName: string; ordreNumber: string } | null;
}

const STATUS_STYLES: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  BROUILLON:  { dot: 'bg-slate-400',   bg: 'bg-slate-100',   text: 'text-slate-600',   label: 'Brouillon' },
  PLANIFIE:   { dot: 'bg-blue-400',    bg: 'bg-blue-100',    text: 'text-blue-700',    label: 'Planifié' },
  OUVERT:     { dot: 'bg-emerald-500', bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Ouvert' },
  CLOS:       { dot: 'bg-amber-400',   bg: 'bg-amber-100',   text: 'text-amber-700',   label: 'Clos' },
  DEPOUILLE:  { dot: 'bg-purple-400',  bg: 'bg-purple-100',  text: 'text-purple-700',  label: 'Dépouillé' },
  PUBLIE:     { dot: 'bg-teal-500',    bg: 'bg-teal-100',    text: 'text-teal-700',    label: 'Publié' },
};

const QUICK_LINKS: { label: string; href: string; icon: ReactElement; roles: string[] }[] = [
  {
    label: 'Voter maintenant',
    href: '/vote',
    roles: ['ELECTEUR', 'CANDIDAT', 'COMMISSION', 'ADMIN'],
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
  {
    label: 'Mes candidatures',
    href: '/candidatures',
    roles: ['ELECTEUR', 'CANDIDAT'],
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
  {
    label: 'Gérer les scrutins',
    href: '/admin/scrutins',
    roles: ['COMMISSION', 'ADMIN'],
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    label: 'Backoffice',
    href: '/backoffice',
    roles: ['ADMIN'],
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    label: 'Journal d\'audit',
    href: '/audit',
    roles: ['ADMIN', 'OBSERVATEUR', 'COMMISSION'],
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
];

const ACTION_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: 'Connexion',
  LOGIN_FAILED: 'Connexion échouée',
  LOGIN_OTP_FAILED: 'OTP invalide',
  LOGOUT: 'Déconnexion',
  PASSWORD_CHANGED: 'Mot de passe modifié',
  VOTE_CAST: 'Vote enregistré',
  CANDIDACY_SUBMITTED: 'Candidature soumise',
  CANDIDACY_VALIDATED: 'Candidature validée',
  CANDIDACY_REJECTED: 'Candidature rejetée',
  ELECTION_CREATED: 'Scrutin créé',
  ELECTION_STATUS_CHANGED: 'Statut scrutin modifié',
  TALLY_COMPUTED: 'Dépouillement effectué',
  TALLY_PUBLISHED: 'Résultats publiés',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const role = user?.role ?? '';
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const isPrivileged = ['ADMIN', 'COMMISSION', 'OBSERVATEUR'].includes(role);

  useEffect(() => {
    Promise.all([
      api.get<any>('/dashboard/stats').catch(() => null),
      api.get<any>('/elections?limit=5').catch(() => null),
    ]).then(([statsData, electionsData]) => {
      const raw: any[] = Array.isArray(electionsData?.data) ? electionsData.data : [];
      setStats({
        openCount: statsData?.elections?.open ?? 0,
        memberCount: statsData?.members?.active ?? 0,
        myVotes: 0,
        totalElections: statsData?.elections?.total ?? 0,
        elections: raw.map((e: any) => ({
          id: e.id,
          title: e.title,
          status: e.status,
          _count: { positions: e.positions?.length ?? 0, voteRecords: e._count?.voteRecords ?? 0 },
        })),
      });
    });

    if (isPrivileged) {
      api.get<ActivityItem[]>('/dashboard/recent-activity?limit=8').then(setRecentActivity).catch(() => {});
    }
  }, [isPrivileged]);

  const initials = user?.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() ?? '?';

  const STAT_CARDS = [
    { label: 'Scrutins ouverts', value: stats?.openCount ?? '—', color: 'bg-emerald-50 text-emerald-700',
      icon: <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg> },
    { label: 'Membres actifs', value: stats?.memberCount ?? '—', color: 'bg-blue-50 text-blue-700',
      icon: <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg> },
    { label: 'Votes enregistrés', value: stats?.myVotes ?? '—', color: 'bg-purple-50 text-purple-700',
      icon: <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M9 12l2 2 4-4" /></svg> },
    { label: 'Scrutins au total', value: stats?.totalElections ?? '—', color: 'bg-amber-50 text-amber-700',
      icon: <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg> },
  ];

  const visibleLinks = QUICK_LINKS.filter((l) => l.roles.includes(role));

  return (
    <AppShell>
      {/* Greeting banner */}
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-xl font-black text-white shadow-md">
          {initials}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-400">
            {ROLE_LABELS[role]} · {user?.ordreNumber}
          </p>
          <h1 className="text-2xl font-black text-ink-900">
            Bonjour, {user?.name?.split(' ')[0]}
          </h1>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_CARDS.map((s) => (
          <div key={s.label} className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-ink-100">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${s.color}`}>
              {s.icon}
            </div>
            <div>
              <p className="text-3xl font-black leading-none text-ink-900">{s.value}</p>
              <p className="mt-1 text-xs font-medium text-ink-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <DashboardCharts />

      {/* Résultats en direct pour chaque scrutin ouvert */}
      {stats?.elections.filter((e) => e.status === 'OUVERT').map((e) => (
        <div key={e.id} className="mt-8">
          <LiveResultsWidget electionId={e.id} electionTitle={e.title} />
        </div>
      ))}

      {/* Scrutins + Quick links */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Scrutins */}
        <div className="lg:col-span-2 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-ink-100">
          <div className="flex items-center justify-between border-b border-ink-100 px-6 py-4">
            <h2 className="text-base font-bold text-ink-900">Scrutins récents</h2>
            <Link to="/vote" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
              Tout voir →
            </Link>
          </div>
          {!stats ? (
            <div className="px-6 py-10 text-center text-sm text-ink-400">Chargement…</div>
          ) : stats.elections.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-ink-400">Aucun scrutin pour le moment.</div>
          ) : (
            <ul className="divide-y divide-ink-50">
              {stats.elections.map((e) => {
                const s = STATUS_STYLES[e.status] ?? STATUS_STYLES.BROUILLON;
                return (
                  <li key={e.id} className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-ink-50/50 transition">
                    <div className="min-w-0">
                      <Link to={`/vote/${e.id}`} className="block truncate font-semibold text-ink-900 hover:text-brand-700">
                        {e.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-ink-400">
                        {e._count.positions} poste(s) · {e._count.voteRecords} votant(s)
                      </p>
                    </div>
                    <span className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${s.bg} ${s.text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                      {s.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Quick links */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-ink-100">
          <h2 className="text-base font-bold text-ink-900">Accès rapides</h2>
          <div className="mt-4 flex flex-col gap-2">
            {visibleLinks.map((l) => (
              <Link
                key={l.href}
                to={l.href}
                className="flex items-center gap-3 rounded-xl border border-ink-100 px-4 py-3 text-sm font-medium text-ink-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
              >
                <span className="text-brand-500">{l.icon}</span>
                {l.label}
                <svg viewBox="0 0 24 24" className="ml-auto h-4 w-4 text-ink-300" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Activité récente — ADMIN/COMMISSION/OBSERVATEUR uniquement */}
      {isPrivileged && recentActivity.length > 0 && (
        <div className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-ink-100">
          <div className="flex items-center justify-between border-b border-ink-100 px-6 py-4">
            <h2 className="text-base font-bold text-ink-900">Activité récente</h2>
            <Link to="/audit" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
              Journal complet →
            </Link>
          </div>
          <ul className="divide-y divide-ink-50">
            {recentActivity.map((item) => (
              <li key={item.id} className="flex items-center gap-4 px-6 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-100 text-[11px] font-bold text-ink-500">
                  {item.actor
                    ? `${item.actor.firstName[0] ?? ''}${item.actor.lastName[0] ?? ''}`
                    : '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-800">
                    {ACTION_LABELS[item.action] ?? item.action}
                    {item.actor && (
                      <span className="ml-1 font-normal text-ink-500">
                        — {item.actor.firstName} {item.actor.lastName}
                      </span>
                    )}
                  </p>
                  {item.entity && (
                    <p className="text-xs text-ink-400">{item.entity}</p>
                  )}
                </div>
                <time className="shrink-0 text-[11px] text-ink-400">
                  {new Date(item.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                </time>
              </li>
            ))}
          </ul>
        </div>
      )}
    </AppShell>
  );
}
