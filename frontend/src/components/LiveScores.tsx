import { useEffect, useState, useCallback } from 'react';

interface LiveElection {
  electionId: string;
  title: string;
  status: string;
  round: number;
  voteCount: number;
  eligibleCount: number;
  turnout: number;
}

const REFRESH_MS = 30_000;

export function LiveScores() {
  const [elections, setElections] = useState<LiveElection[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        (import.meta.env.VITE_API_URL || 'http://localhost:3001/api') + '/dashboard/live-scores',
        { credentials: 'include' }
      );
      if (!res.ok) { setLoading(false); return; }
      const data = await res.json();
      setElections(Array.isArray(data) ? data : []);
      setLastRefresh(new Date());
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  if (loading) {
    return (
      <div className="card p-6">
        <div className="mb-4 h-4 w-48 animate-pulse rounded bg-ink-100" />
        <div className="h-[120px] animate-pulse rounded-lg bg-ink-50" />
      </div>
    );
  }

  if (elections.length === 0) {
    return (
      <div className="card p-8 text-center text-sm text-ink-400">
        Aucun scrutin ouvert avec des votes.
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-ink-100 px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <span className="text-xs font-black uppercase tracking-widest text-emerald-600">Live</span>
          {lastRefresh && (
            <span className="text-xs text-ink-400">
              · mis à jour à {lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </div>
        <h2 className="text-base font-semibold text-ink-900">Participation en temps réel</h2>
      </div>

      <ul className="divide-y divide-ink-100">
        {elections.map((e) => (
          <li key={e.electionId} className="px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-ink-900">{e.title}</p>
                <p className="mt-0.5 text-xs text-ink-400">
                  Tour {e.round} · {e.voteCount} vote{e.voteCount !== 1 ? 's' : ''} / {e.eligibleCount} éligibles
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-2xl font-black text-brand-700">{e.turnout.toFixed(1)} %</p>
                <p className="text-xs text-ink-400">participation</p>
              </div>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-100">
              <div
                className="h-full rounded-full bg-brand-500 transition-all duration-700"
                style={{ width: `${Math.min(e.turnout, 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
