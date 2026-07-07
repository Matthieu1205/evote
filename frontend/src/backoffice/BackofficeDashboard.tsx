import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BackofficeShell } from './BackofficeShell';
import { DashboardCharts } from '../components/DashboardCharts';
import { api } from '../lib/api';

interface Stats {
  memberCount: number;
  electionCount: number;
  pendingCandidacies: number;
  openElections: number;
}

interface RecentLog {
  id: string;
  action: string;
  createdAt: string;
  actor?: { firstName: string; lastName: string } | null;
}

const ACTION_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: 'Connexion',
  LOGIN_FAILED: 'Échec connexion',
  VOTE_CAST: 'Vote enregistré',
  ELECTION_CREATED: 'Scrutin créé',
  ELECTION_UPDATED: 'Scrutin modifié',
  CANDIDACY_SUBMITTED: 'Candidature soumise',
  CANDIDACY_VALIDATED: 'Candidature validée',
  CANDIDACY_REJECTED: 'Candidature rejetée',
  MEMBER_CREATED: 'Membre créé',
  MEMBER_UPDATED: 'Membre modifié',
  TALLY_COMPUTED: 'Dépouillement',
  PASSWORD_CHANGED: 'MDP modifié',
};

const STATUS_COLORS: Record<string, string> = {
  BROUILLON: 'bg-slate-100 text-slate-600',
  PLANIFIE: 'bg-blue-100 text-blue-700',
  OUVERT: 'bg-emerald-100 text-emerald-700',
  CLOS: 'bg-amber-100 text-amber-700',
  DEPOUILLE: 'bg-purple-100 text-purple-700',
  PUBLIE: 'bg-teal-100 text-teal-700',
};

interface Election {
  id: string;
  title: string;
  status: string;
  startAt: string;
  endAt: string;
  _count: { voteRecords: number; positions: number };
}

export default function BackofficeDashboard() {
  const [stats, setStats] = useState<Stats>({ memberCount: 0, electionCount: 0, pendingCandidacies: 0, openElections: 0 });
  const [elections, setElections] = useState<Election[]>([]);
  const [logs, setLogs] = useState<RecentLog[]>([]);

  useEffect(() => {
    Promise.all([
      api.get<{ meta: { total: number } }>('/users?limit=1'),
      api.get<{ data: Election[] }>('/elections'),
      api.get<{ meta: { total: number } }>('/candidacies?status=SOUMISE&limit=1'),
      api.get<{ data: RecentLog[] }>('/audit?limit=8'),
    ]).then(([users, elec, cand, audit]) => {
      const elecData = elec.data ?? [];
      setStats({
        memberCount: users.meta?.total ?? 0,
        electionCount: elecData.length,
        pendingCandidacies: cand.meta?.total ?? 0,
        openElections: elecData.filter((e) => e.status === 'OUVERT').length,
      });
      setElections(elecData.slice(0, 5));
      setLogs(audit.data ?? []);
    }).catch(() => {});
  }, []);

  const STAT_CARDS = [
    {
      label: 'Membres inscrits',
      value: stats.memberCount,
      href: '/backoffice/membres',
      color: 'bg-emerald-50 text-emerald-700',
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      label: 'Scrutins',
      value: stats.electionCount,
      href: '/backoffice/scrutins',
      color: 'bg-blue-50 text-blue-700',
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    },
    {
      label: 'Candidatures en attente',
      value: stats.pendingCandidacies,
      href: '/backoffice/candidatures',
      color: 'bg-amber-50 text-amber-700',
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
      ),
    },
    {
      label: 'Scrutins ouverts',
      value: stats.openElections,
      href: '/backoffice/scrutins',
      color: 'bg-teal-50 text-teal-700',
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <polyline points="9 11 12 14 22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      ),
    },
  ];

  return (
    <BackofficeShell>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-900">Tableau de bord</h1>
        <p className="mt-1 text-sm text-slate-500">Vue d'ensemble de la plateforme électorale.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STAT_CARDS.map((card) => (
          <Link
            key={card.label}
            to={card.href}
            className="group flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition hover:shadow-md hover:ring-slate-200"
          >
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${card.color}`}>
              {card.icon}
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{card.value}</p>
              <p className="text-xs font-medium text-slate-500">{card.label}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Scrutins récents */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Scrutins récents</h2>
            <Link to="/backoffice/scrutins" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
              Voir tout →
            </Link>
          </div>
          {elections.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">Aucun scrutin.</p>
          ) : (
            <div className="space-y-3">
              {elections.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{e.title}</p>
                    <p className="text-xs text-slate-400">
                      {e._count.voteRecords} votant(s) · {e._count.positions} poste(s)
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${STATUS_COLORS[e.status] ?? 'bg-slate-100 text-slate-500'}`}>
                    {e.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Journal récent */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Activité récente</h2>
            <Link to="/backoffice/audit" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
              Journal complet →
            </Link>
          </div>
          {logs.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">Aucune activité.</p>
          ) : (
            <div className="space-y-2.5">
              {logs.map((l) => (
                <div key={l.id} className="flex items-start gap-3">
                  <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-700">
                      {ACTION_LABELS[l.action] ?? l.action}
                      {l.actor && (
                        <span className="font-normal text-slate-500">
                          {' '}· {l.actor.firstName} {l.actor.lastName}
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(l.createdAt).toLocaleString('fr-FR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <DashboardCharts />

      {/* Raccourcis */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: 'Ajouter un membre', href: '/backoffice/membres',
            icon: <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>,
          },
          {
            label: 'Nouveau scrutin', href: '/backoffice/scrutins',
            icon: <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
          },
          {
            label: 'Valider candidatures', href: '/backoffice/candidatures',
            icon: <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>,
          },
          {
            label: "Consulter l'audit", href: '/backoffice/audit',
            icon: <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>,
          },
        ].map((s) => (
          <Link
            key={s.href}
            to={s.href}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
          >
            <span className="text-emerald-500">{s.icon}</span>
            {s.label}
          </Link>
        ))}
      </div>
    </BackofficeShell>
  );
}
