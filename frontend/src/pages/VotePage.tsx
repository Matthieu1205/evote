import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { api } from '../lib/api';

interface Election {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  startAt: string;
  endAt: string;
  _count: { positions: number };
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  OUVERT:    { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Ouvert' },
  CLOS:      { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-400',   label: 'Clos' },
  DEPOUILLE: { bg: 'bg-purple-100',  text: 'text-purple-700',  dot: 'bg-purple-400',  label: 'Dépouillé' },
  PUBLIE:    { bg: 'bg-teal-100',    text: 'text-teal-700',    dot: 'bg-teal-500',    label: 'Publié' },
};

export default function VotePage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [voted, setVoted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ data: Election[] }>('/elections')
      .then(async (data) => {
        const list = (data.data ?? []).filter((e) =>
          ['OUVERT', 'DEPOUILLE', 'PUBLIE', 'CLOS'].includes(e.status)
        );
        setElections(list);

        const openIds = list.filter((e) => e.status === 'OUVERT').map((e) => e.id);
        if (openIds.length > 0) {
          const checks = await Promise.allSettled(
            openIds.map((id) => api.get<{ hasVoted: boolean }>(`/votes/check/${id}`))
          );
          const votedSet = new Set<string>();
          checks.forEach((r, i) => {
            if (r.status === 'fulfilled' && r.value.hasVoted) votedSet.add(openIds[i]);
          });
          setVoted(votedSet);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-ink-900">Scrutins</h1>
        <p className="mt-1 text-sm text-ink-500">
          Participez aux scrutins ouverts et consultez les résultats publiés.
        </p>
      </div>

      {loading && (
        <div className="grid gap-5 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl bg-ink-100" />
          ))}
        </div>
      )}

      {!loading && elections.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-16 text-center shadow-sm ring-1 ring-ink-100">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-ink-100">
            <svg viewBox="0 0 24 24" className="h-8 w-8 text-ink-400" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <p className="mt-4 text-base font-semibold text-ink-700">Aucun scrutin disponible</p>
          <p className="mt-1 text-sm text-ink-400">Les scrutins ouverts apparaîtront ici.</p>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {elections.map((e) => {
          const cfg = STATUS_CONFIG[e.status];
          const isOpen = e.status === 'OUVERT';
          const hasVoted = voted.has(e.id);
          const showResults = ['DEPOUILLE', 'PUBLIE'].includes(e.status);
          const daysLeft = Math.max(0, Math.ceil((new Date(e.endAt).getTime() - Date.now()) / 86_400_000));

          return (
            <div key={e.id} className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-ink-100 transition hover:shadow-md hover:ring-ink-200">
              {/* Colored top bar */}
              <div className={`h-1.5 w-full ${isOpen ? 'bg-gradient-to-r from-brand-500 to-brand-400' : 'bg-ink-200'}`} />

              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-base font-bold leading-snug text-ink-900 group-hover:text-brand-700 transition">
                    {e.title}
                  </h2>
                  <span className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${cfg.bg} ${cfg.text}`}>
                    {isOpen && <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot} animate-pulse`} />}
                    {cfg.label}
                  </span>
                </div>

                {e.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-ink-500">{e.description}</p>
                )}

                <div className="mt-3 flex items-center gap-4 text-xs text-ink-400">
                  <span className="flex items-center gap-1">
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                    </svg>
                    {e._count.positions} poste{e._count.positions > 1 ? 's' : ''}
                  </span>
                  {isOpen && daysLeft <= 7 && (
                    <span className="flex items-center gap-1 text-amber-600 font-medium">
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      {daysLeft === 0 ? "Clôture aujourd'hui" : `Clôture dans ${daysLeft}j`}
                    </span>
                  )}
                  {!isOpen && (
                    <span>Clôturé le {new Date(e.endAt).toLocaleDateString('fr-FR', { dateStyle: 'long' })}</span>
                  )}
                </div>

                <div className="mt-auto pt-5 flex flex-wrap items-center gap-3">
                  {isOpen && !hasVoted && (
                    <Link
                      to={`/vote/${e.id}`}
                      className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="9 11 12 14 22 4" />
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                      </svg>
                      Voter
                    </Link>
                  )}
                  {isOpen && hasVoted && (
                    <span className="inline-flex items-center gap-2 rounded-xl bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700">
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M5 12l5 5L20 7" />
                      </svg>
                      Vote enregistré
                    </span>
                  )}
                  {showResults && (
                    <Link
                      to={`/vote/${e.id}/results`}
                      className="inline-flex items-center gap-2 rounded-xl border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="18" y1="20" x2="18" y2="10" />
                        <line x1="12" y1="20" x2="12" y2="4" />
                        <line x1="6" y1="20" x2="6" y2="14" />
                      </svg>
                      Voir les résultats
                    </Link>
                  )}
                  {isOpen && (
                    <Link
                      to={`/vote/${e.id}/live`}
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                    >
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                      </span>
                      Résultats en direct
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
