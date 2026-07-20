import { useEffect, useState, useCallback } from 'react';
import { AppShell } from '../components/AppShell';
import { Pagination } from '../components/Pagination';
import { ASSIGNABLE_ROLE_LABELS } from '../lib/rbac';
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

const empty = {
  firstName: '',
  lastName: '',
  email: '',
  section: '',
  region: '',
};

export default function AdminMembresPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 50;

  const [form, setForm] = useState({ ...empty });
  const [showForm, setShowForm] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editingEmail, setEditingEmail] = useState<{ id: string; value: string } | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [resetMsg, setResetMsg] = useState<{ id: string; ok: boolean; text: string } | null>(null);

  const BASE = import.meta.env.PROD ? '/api' : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

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
      load();
    } catch (err) {
      setEmailError((err as Error).message ?? 'Erreur lors de la mise à jour');
    }
  }

  async function resetPassword(id: string, name: string) {
    if (!window.confirm(`Réinitialiser le mot de passe de ${name} ? Un nouveau mot de passe temporaire sera envoyé par email.`)) return;
    setResetMsg(null);
    try {
      const res = await api.post<{ message: string }>(`/users/${id}/reset-password`);
      setResetMsg({ id, ok: true, text: res.message });
    } catch (err) {
      setResetMsg({ id, ok: false, text: (err as Error).message ?? 'Erreur lors de la réinitialisation.' });
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    try {
      await api.post('/users', form);
      setForm({ ...empty });
      setShowForm(false);
      load();
    } catch (err) {
      setCreateError((err as Error).message ?? 'Erreur');
    }
  }

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-ink-900">Membres</h1>
          <p className="mt-1 text-ink-500">
            Registre ordinal, statuts et éligibilité électorale.
          </p>
        </div>
        <div className="flex gap-2">
          <a href={`${BASE}/users/export`} className="btn btn-ghost">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Exporter CSV
          </a>
          <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? (
              <>
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                Fermer
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Ajouter un membre
              </>
            )}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={create} className="card mt-6 grid gap-4 p-6 sm:grid-cols-2">
          {createError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 sm:col-span-2">
              {createError}
            </div>
          )}
          <div>
            <label className="label">Prénom</label>
            <input className="input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
          </div>
          <div>
            <label className="label">Nom</label>
            <input className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div>
            <label className="label">Section</label>
            <input className="input" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} />
          </div>
          <div className="sm:col-span-2 flex flex-wrap items-center gap-4">
            <button type="submit" className="btn btn-primary">Créer le membre</button>
            <p className="text-xs text-ink-400">Un mot de passe temporaire sera généré et envoyé par email.</p>
          </div>
        </form>
      )}

      <div className="mt-6">
        <input
          className="input max-w-sm"
          placeholder="Rechercher par nom, numéro, email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="card mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-400">
              <th className="px-4 py-3">Membre</th>
              <th className="px-4 py-3">Section</th>
              <th className="px-4 py-3">Rôle</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Éligible</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {members.map((m) => (
              <tr key={m.id} className="hover:bg-ink-50/50">
                <td className="px-4 py-3">
                  <div className="font-medium text-ink-900">
                    {m.firstName} {m.lastName}
                  </div>
                  <div className="text-xs text-ink-400">{m.ordreNumber}</div>

                  {editingEmail?.id === m.id ? (
                    <div className="mt-1">
                      <div className="flex items-center gap-1">
                        <input
                          type="email"
                          autoFocus
                          className="rounded border border-ink-300 px-2 py-0.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
                          value={editingEmail.value}
                          onChange={(e) => setEditingEmail({ id: m.id, value: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEmail(m.id, editingEmail.value);
                            if (e.key === 'Escape') { setEditingEmail(null); setEmailError(null); }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => saveEmail(m.id, editingEmail.value)}
                          className="rounded bg-brand-600 px-2 py-0.5 text-xs text-white hover:bg-brand-700"
                        >
                          ✓
                        </button>
                        <button
                          type="button"
                          onClick={() => { setEditingEmail(null); setEmailError(null); }}
                          className="rounded border border-ink-200 px-2 py-0.5 text-xs text-ink-500 hover:bg-ink-50"
                        >
                          ✕
                        </button>
                      </div>
                      {emailError && <p className="mt-0.5 text-xs text-red-600">{emailError}</p>}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setEditingEmail({ id: m.id, value: m.email }); setEmailError(null); }}
                      className="mt-0.5 block text-xs text-ink-400 hover:text-brand-600 hover:underline"
                      title="Cliquer pour modifier l'email"
                    >
                      {m.email}
                    </button>
                  )}
                </td>
                <td className="px-4 py-3 text-ink-600">{m.section ?? '—'}</td>
                <td className="px-4 py-3">
                  <select
                    className="rounded-lg border border-ink-200 px-2 py-1 text-xs"
                    value={m.role}
                    onChange={(e) => update(m.id, { role: e.target.value })}
                  >
                    {Object.entries(ASSIGNABLE_ROLE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <select
                    className="rounded-lg border border-ink-200 px-2 py-1 text-xs"
                    value={m.status}
                    onChange={(e) => update(m.id, { status: e.target.value })}
                  >
                    {['ACTIF', 'SUSPENDU', 'RADIE', 'RETRAITE'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => update(m.id, { isEligible: !m.isEligible })}
                    className={`badge ${m.isEligible ? 'bg-brand-100 text-brand-700' : 'bg-ink-100 text-ink-500'}`}
                  >
                    {m.isEligible ? 'Oui' : 'Non'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => resetPassword(m.id, `${m.firstName} ${m.lastName}`)}
                    title="Réinitialiser le mot de passe"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 transition hover:bg-amber-100"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                    </svg>
                    Réinit. mdp
                  </button>
                  {resetMsg?.id === m.id && (
                    <p className={`mt-1 text-xs ${resetMsg.ok ? 'text-emerald-600' : 'text-red-600'}`}>
                      {resetMsg.text}
                    </p>
                  )}
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink-400">
                  Aucun membre trouvé.
                </td>
              </tr>
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
