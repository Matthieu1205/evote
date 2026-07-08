import { useEffect, useState } from 'react';
import { BackofficeShell } from './BackofficeShell';
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

const ACTION_COLORS: Record<string, string> = {
  LOGIN_SUCCESS: 'bg-emerald-100 text-emerald-700',
  LOGIN_FAILED: 'bg-red-100 text-red-700',
  VOTE_CAST: 'bg-blue-100 text-blue-700',
  ELECTION_CREATED: 'bg-teal-100 text-teal-700',
  ELECTION_DELETED: 'bg-red-100 text-red-700',
  CANDIDACY_VALIDATED: 'bg-emerald-100 text-emerald-700',
  CANDIDACY_REJECTED: 'bg-red-100 text-red-700',
  MEMBER_CREATED: 'bg-purple-100 text-purple-700',
  TALLY_COMPUTED: 'bg-amber-100 text-amber-700',
};

export default function BackofficeAudit() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 50;

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
    if (action) params.set('action', action);
    if (from) params.set('from', new Date(from).toISOString());
    if (to) params.set('to', new Date(to + 'T23:59:59').toISOString());
    api.get<{ data: Log[]; meta: { pages: number; total: number } }>(`/audit?${params}`)
      .then((d) => {
        setLogs(d.data ?? []);
        setTotalPages(d.meta?.pages ?? 1);
        setTotal(d.meta?.total ?? 0);
      })
      .catch(() => {});
  }, [action, from, to, page]);

  return (
    <BackofficeShell>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900">Journal d'audit</h1>
        <p className="mt-0.5 text-sm text-slate-500">Traçabilité inaltérable de toutes les actions sensibles.</p>
      </div>

      {/* Filtres */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <svg viewBox="0 0 24 24" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          <select
            className="rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm font-medium text-slate-700 focus:border-emerald-400 focus:outline-none"
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1); }}
          >
            <option value="">Toutes les actions</option>
            {Object.entries(ACTION_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500">Du</label>
          <input
            type="date"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-emerald-400 focus:outline-none"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500">Au</label>
          <input
            type="date"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-emerald-400 focus:outline-none"
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1); }}
          />
        </div>
        {(from || to || action) && (
          <button
            onClick={() => { setAction(''); setFrom(''); setTo(''); setPage(1); }}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50"
          >
            Réinitialiser
          </button>
        )}
        {total > 0 && (
          <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">
            {total.toLocaleString('fr-FR')} entrée{total > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Action</th>
                <th className="px-5 py-3.5">Acteur</th>
                <th className="px-5 py-3.5">Entité</th>
                <th className="px-5 py-3.5">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50/60">
                  <td className="whitespace-nowrap px-5 py-3.5 text-xs text-slate-400">
                    {new Date(l.createdAt).toLocaleString('fr-FR')}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ACTION_COLORS[l.action] ?? 'bg-slate-100 text-slate-600'}`}>
                      {ACTION_LABELS[l.action] ?? l.action}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {l.actor ? (
                      <div>
                        <p className="font-medium text-slate-800">{l.actor.firstName} {l.actor.lastName}</p>
                        <p className="text-xs text-slate-400">{l.actor.ordreNumber}</p>
                      </div>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">{l.entity ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-500">
                      {l.ip ?? '—'}
                    </span>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                    Aucune entrée dans le journal.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-5 py-3">
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={setPage} />
        </div>
      </div>
    </BackofficeShell>
  );
}
