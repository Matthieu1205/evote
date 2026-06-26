import { useEffect, useState } from 'react';
import { AppShell } from '../components/AppShell';
import { Pagination } from '../components/Pagination';
import { api } from '../lib/api';

interface Log {
  id: string;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  ip?: string | null;
  createdAt: string;
  actor?: { firstName: string; lastName: string; ordreNumber: string } | null;
}

const ACTION_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: 'Connexion réussie',
  LOGIN_FAILED: 'Échec de connexion',
  OTP_REQUESTED: 'Code OTP demandé',
  VOTE_CAST: 'Vote enregistré',
  ELECTION_CREATED: 'Scrutin créé',
  ELECTION_UPDATED: 'Scrutin modifié',
  ELECTION_DELETED: 'Scrutin supprimé',
  CANDIDACY_SUBMITTED: 'Candidature soumise',
  CANDIDACY_VALIDATED: 'Candidature validée',
  CANDIDACY_REJECTED: 'Candidature rejetée',
  CANDIDACY_WITHDRAWN: 'Candidature retirée',
  CANDIDACY_PROFILE_UPDATED: 'Profil candidat mis à jour',
  MEMBER_CREATED: 'Membre créé',
  MEMBER_UPDATED: 'Membre modifié',
  REGISTRY_IMPORT: 'Import du registre',
  TALLY_COMPUTED: 'Dépouillement',
  REPORT_DOWNLOADED: 'PV téléchargé',
  SEED_IMPORT: 'Initialisation',
  PASSWORD_CHANGED: 'Mot de passe modifié',
};

export default function AuditPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 50;

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
    if (action) params.set('action', action);
    api.get<{ data: Log[]; meta: { pages: number; total: number } }>(`/audit?${params}`)
      .then((d) => {
        setLogs(d.data ?? []);
        setTotalPages(d.meta?.pages ?? 1);
        setTotal(d.meta?.total ?? 0);
      })
      .catch((err) => setError((err as Error).message ?? 'Erreur lors du chargement du journal.'))
      .finally(() => setLoading(false));
  }, [action, page]);

  function handleActionChange(val: string) {
    setAction(val);
    setPage(1);
  }

  return (
    <AppShell>
      <h1 className="text-3xl font-bold text-ink-900">Journal d'audit</h1>
      <p className="mt-1 text-ink-500">
        Traçabilité inaltérable de toutes les actions sensibles.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <select
          className="input max-w-xs"
          value={action}
          onChange={(e) => handleActionChange(e.target.value)}
        >
          <option value="">Toutes les actions</option>
          {Object.entries(ACTION_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        {total > 0 && (
          <span className="text-sm text-ink-400">
            {total} entrée{total > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      <div className="card mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-400">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Acteur</th>
              <th className="px-4 py-3">Entité</th>
              <th className="px-4 py-3">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3.5 animate-pulse rounded bg-ink-100" style={{ width: `${60 + (i + j) * 7 % 30}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <>
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-ink-50/50">
                    <td className="whitespace-nowrap px-4 py-3 text-ink-500">
                      {new Date(l.createdAt).toLocaleString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 font-medium text-ink-900">
                      {ACTION_LABELS[l.action] ?? l.action}
                    </td>
                    <td className="px-4 py-3 text-ink-600">
                      {l.actor
                        ? `${l.actor.firstName} ${l.actor.lastName} (${l.actor.ordreNumber})`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-ink-500">{l.entity ?? '—'}</td>
                    <td className="px-4 py-3 text-ink-400">{l.ip ?? '—'}</td>
                  </tr>
                ))}
                {!loading && logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-ink-400">
                      Aucune entrée pour ce filtre.
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>

        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          onPage={(p) => setPage(p)}
        />
      </div>
    </AppShell>
  );
}
