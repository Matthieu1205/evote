import { useEffect, useState, useCallback, useRef } from 'react';
import { BackofficeShell } from './BackofficeShell';
import { Pagination } from '../components/Pagination';
import { ROLE_LABELS } from '../lib/rbac';
import { api } from '../lib/api';

interface Member {
  id: string;
  ordreNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
  isEligible: boolean;
  section?: string | null;
  region?: string | null;
}

const empty = { ordreNumber: '', firstName: '', lastName: '', email: '', section: '', region: '' };

const STATUS_COLORS: Record<string, string> = {
  ACTIF: 'bg-emerald-100 text-emerald-700',
  SUSPENDU: 'bg-amber-100 text-amber-700',
  RADIE: 'bg-red-100 text-red-700',
  RETRAITE: 'bg-slate-100 text-slate-500',
};

export default function BackofficeMembers() {
  const [members, setMembers] = useState<Member[]>([]);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [form, setForm] = useState({ ...empty });
  const [showForm, setShowForm] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editingEmail, setEditingEmail] = useState<{ id: string; value: string } | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: { row: number; reason: string }[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pageSize = 50;
  const BASE = import.meta.env.PROD
    ? '/api'
    : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ search: q, page: String(page), limit: String(pageSize) });
      const data = await api.get<{ data: Member[]; meta: { total: number; pages: number } }>(`/users?${params}`);
      setMembers(data.data ?? []);
      setTotal(data.meta?.total ?? 0);
      setTotalPages(data.meta?.pages ?? 1);
    } catch { /* ignore */ }
  }, [q, page]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);
  useEffect(() => { setPage(1); }, [q]);

  async function update(id: string, patch: Record<string, unknown>) {
    await api.put(`/users/${id}`, patch);
    load();
  }

  async function saveEmail(id: string, email: string) {
    setEmailError(null);
    try {
      await api.put(`/users/${id}`, { email });
      setEditingEmail(null);
      showToast('Email mis à jour.');
      load();
    } catch (err) {
      setEmailError((err as Error).message ?? 'Erreur');
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    try {
      await api.post('/users', form);
      setForm({ ...empty });
      setShowForm(false);
      showToast('Membre créé avec succès.');
      load();
    } catch (err) {
      setCreateError((err as Error).message ?? 'Erreur');
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await api.postForm<{ created: number; skipped: number; errors: { row: number; reason: string }[] }>('/users/import', formData);
      setImportResult(result);
      if (result.created > 0) load();
    } catch (err) {
      setImportResult({ created: 0, skipped: 0, errors: [{ row: 0, reason: (err as Error).message ?? 'Erreur import' }] });
    } finally {
      setImporting(false);
    }
  }

  function downloadTemplate() {
    const csv = 'ordreNumber,prenom,nom,email,section,region,telephone,eligible\nMEMBRE-001,Jean,Dupont,jean@exemple.com,A,Nord,0600000001,oui\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'modele-import-membres.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <BackofficeShell>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Membres</h1>
          <p className="mt-0.5 text-sm text-slate-500">Registre ordinal, statuts et éligibilité électorale.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleImport} />
          <button type="button" onClick={downloadTemplate} className="bo-btn bo-btn-ghost" title="Télécharger le modèle CSV">
            Modèle CSV
          </button>
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={importing} className="bo-btn bo-btn-ghost">
            {importing ? 'Import…' : 'Importer CSV'}
          </button>
          <a href={`${BASE}/users/export`} className="bo-btn bo-btn-ghost">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Exporter CSV
          </a>
          <button
            type="button"
            onClick={() => setShowForm((s) => !s)}
            className={showForm ? 'bo-btn bo-btn-close' : 'bo-btn bo-btn-primary'}
          >
            {showForm ? (
              <>
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                Fermer
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Ajouter un membre
              </>
            )}
          </button>
        </div>
      </div>

      {/* Résultat import CSV */}
      {importResult && (
        <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${importResult.errors.length > 0 && importResult.created === 0 ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
          <div className="flex items-center justify-between">
            <span>
              Import terminé — <strong>{importResult.created} créé{importResult.created > 1 ? 's' : ''}</strong>,{' '}
              {importResult.skipped} ignoré{importResult.skipped > 1 ? 's' : ''} (déjà existants)
              {importResult.errors.length > 0 && `, ${importResult.errors.length} erreur${importResult.errors.length > 1 ? 's' : ''}`}
            </span>
            <button type="button" onClick={() => setImportResult(null)} className="ml-4 text-inherit opacity-60 hover:opacity-100">✕</button>
          </div>
          {importResult.errors.length > 0 && (
            <ul className="mt-2 list-disc pl-4 text-xs">
              {importResult.errors.slice(0, 5).map((e) => (
                <li key={e.row}>Ligne {e.row} : {e.reason}</li>
              ))}
              {importResult.errors.length > 5 && <li>…et {importResult.errors.length - 5} autres erreurs</li>}
            </ul>
          )}
        </div>
      )}

      {/* Formulaire de création */}
      {showForm && (
        <form onSubmit={create} className="mb-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {createError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 sm:col-span-2 lg:col-span-3">
              {createError}
            </div>
          )}
          {[
            { key: 'ordreNumber', label: 'Numéro de membre', req: true },
            { key: 'firstName', label: 'Prénom', req: true },
            { key: 'lastName', label: 'Nom', req: true },
            { key: 'email', label: 'Email', req: true, type: 'email' },
            { key: 'section', label: 'Section', req: false },
            { key: 'region', label: 'Région', req: false },
          ].map(({ key, label, req, type }) => (
            <div key={key}>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</label>
              <input
                type={type ?? 'text'}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                value={(form as Record<string, string>)[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                required={req}
              />
            </div>
          ))}
          <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap items-center gap-4">
            <button type="submit" className="bo-btn bo-btn-primary">
              Créer le membre
            </button>
            <p className="text-xs text-slate-400">Un mot de passe temporaire sera généré et envoyé par email.</p>
          </div>
        </form>
      )}

      {/* Recherche */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <svg viewBox="0 0 24 24" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            placeholder="Rechercher par nom, numéro, email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3.5">Membre</th>
                <th className="px-5 py-3.5">Section</th>
                <th className="px-5 py-3.5">Rôle</th>
                <th className="px-5 py-3.5">Statut</th>
                <th className="px-5 py-3.5">Éligible</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                        {m.firstName[0] ?? ''}{m.lastName[0] ?? ''}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{m.firstName} {m.lastName}</p>
                        <p className="text-xs text-slate-400">{m.ordreNumber}</p>
                        {editingEmail?.id === m.id ? (
                          <div className="mt-1 flex items-center gap-1">
                            <input
                              type="email"
                              autoFocus
                              className="rounded-lg border border-slate-300 px-2 py-0.5 text-xs focus:border-emerald-400 focus:outline-none"
                              value={editingEmail.value}
                              onChange={(e) => setEditingEmail({ id: m.id, value: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEmail(m.id, editingEmail.value);
                                if (e.key === 'Escape') { setEditingEmail(null); setEmailError(null); }
                              }}
                            />
                            <button type="button" onClick={() => saveEmail(m.id, editingEmail.value)}
                              className="rounded bg-emerald-600 px-2 py-0.5 text-xs text-white">✓</button>
                            <button type="button" onClick={() => { setEditingEmail(null); setEmailError(null); }}
                              className="rounded border border-slate-200 px-2 py-0.5 text-xs text-slate-500">✕</button>
                          </div>
                        ) : (
                          <button type="button"
                            onClick={() => { setEditingEmail({ id: m.id, value: m.email }); setEmailError(null); }}
                            className="text-xs text-slate-400 hover:text-emerald-600 hover:underline">
                            {m.email}
                          </button>
                        )}
                        {emailError && editingEmail?.id === m.id && (
                          <p className="text-xs text-red-600">{emailError}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">{m.section ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    <select
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 focus:border-emerald-400 focus:outline-none"
                      value={m.role}
                      onChange={(e) => update(m.id, { role: e.target.value })}
                    >
                      {Object.entries(ROLE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-3.5">
                    <select
                      className={`rounded-lg border-0 px-2 py-1 text-xs font-semibold focus:outline-none ${STATUS_COLORS[m.status] ?? 'bg-slate-100 text-slate-500'}`}
                      value={m.status}
                      onChange={(e) => update(m.id, { status: e.target.value })}
                    >
                      {['ACTIF', 'SUSPENDU', 'RADIE', 'RETRAITE'].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      type="button"
                      onClick={() => update(m.id, { isEligible: !m.isEligible })}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        m.isEligible
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {m.isEligible ? '✓ Oui' : '— Non'}
                    </button>
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                    Aucun membre trouvé.
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
