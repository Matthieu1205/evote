import { useEffect, useState, useCallback } from 'react';
import { BackofficeShell } from './BackofficeShell';
import { api } from '../lib/api';

interface Election {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  startAt: string;
  endAt: string;
  candidacyStartAt?: string | null;
  candidacyEndAt?: string | null;
  majorityRule: string;
  _count: { positions: number; ballots: number; voteRecords: number };
}

interface PosForm { title: string; seats: number; }

const STATUS_COLORS: Record<string, string> = {
  BROUILLON: 'bg-slate-100 text-slate-600',
  PLANIFIE: 'bg-blue-100 text-blue-700',
  OUVERT: 'bg-emerald-100 text-emerald-700',
  CLOS: 'bg-amber-100 text-amber-700',
  DEPOUILLE: 'bg-purple-100 text-purple-700',
  PUBLIE: 'bg-teal-100 text-teal-700',
};

const STATUS_LABELS: Record<string, string> = {
  BROUILLON: 'Brouillon',
  PLANIFIE: 'Planifié',
  OUVERT: 'Ouvert',
  CLOS: 'Clos',
  DEPOUILLE: 'Dépouillé',
  PUBLIE: 'Publié',
};

function toLocalDatetime(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function BackofficeElections() {
  const [elections, setElections] = useState<Election[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', description: '', majorityRule: 'RELATIVE', startAt: '', endAt: '', candidacyStartAt: '', candidacyEndAt: '' });
  const [positions, setPositions] = useState<PosForm[]>([{ title: '', seats: 1 }]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', startAt: '', endAt: '', candidacyStartAt: '', candidacyEndAt: '' });
  const [editError, setEditError] = useState<string | null>(null);
  const [tallyingId, setTallyingId] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  const load = useCallback(async () => {
    try {
      const data = await api.get<{ data: Election[] }>('/elections');
      setElections(data.data ?? []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/elections', {
        title: form.title,
        description: form.description,
        majorityRule: form.majorityRule,
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
        ...(form.candidacyStartAt ? { candidacyStartAt: new Date(form.candidacyStartAt).toISOString() } : {}),
        ...(form.candidacyEndAt ? { candidacyEndAt: new Date(form.candidacyEndAt).toISOString() } : {}),
        positions: positions.filter((p) => p.title.trim()),
      });
      setShowForm(false);
      setForm({ title: '', description: '', majorityRule: 'RELATIVE', startAt: '', endAt: '', candidacyStartAt: '', candidacyEndAt: '' });
      setPositions([{ title: '', seats: 1 }]);
      showToast('Scrutin créé avec succès.');
      load();
    } catch (err) {
      setError((err as Error).message ?? 'Erreur');
    }
  }

  async function setStatus(id: string, status: string) {
    await api.put(`/elections/${id}/status`, { status });
    showToast('Statut mis à jour.');
    load();
  }

  function startEdit(el: Election) {
    setEditingId(el.id);
    setEditError(null);
    setEditForm({
      title: el.title,
      description: el.description ?? '',
      startAt: toLocalDatetime(el.startAt),
      endAt: toLocalDatetime(el.endAt),
      candidacyStartAt: el.candidacyStartAt ? toLocalDatetime(el.candidacyStartAt) : '',
      candidacyEndAt: el.candidacyEndAt ? toLocalDatetime(el.candidacyEndAt) : '',
    });
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    setEditError(null);
    try {
      await api.put(`/elections/${editingId}`, {
        title: editForm.title,
        description: editForm.description,
        startAt: new Date(editForm.startAt).toISOString(),
        endAt: new Date(editForm.endAt).toISOString(),
        candidacyStartAt: editForm.candidacyStartAt ? new Date(editForm.candidacyStartAt).toISOString() : null,
        candidacyEndAt: editForm.candidacyEndAt ? new Date(editForm.candidacyEndAt).toISOString() : null,
      });
      setEditingId(null);
      showToast('Scrutin modifié.');
      load();
    } catch (err) {
      setEditError((err as Error).message ?? 'Erreur');
    }
  }

  async function runTally(id: string) {
    if (!confirm('Lancer le dépouillement ? Les résultats resteront privés jusqu\'à publication.')) return;
    setTallyingId(id);
    try {
      await api.post(`/elections/${id}/tally`, { publish: false });
      showToast('Dépouillement effectué.');
      load();
    } catch (err) {
      alert((err as Error).message ?? 'Erreur lors du dépouillement');
    } finally {
      setTallyingId(null);
    }
  }

  async function deleteElection(id: string, title: string) {
    if (!confirm(`Supprimer définitivement "${title}" ?`)) return;
    await api.delete(`/elections/${id}`);
    showToast('Scrutin supprimé.');
    load();
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
          <h1 className="text-2xl font-black text-slate-900">Scrutins</h1>
          <p className="mt-0.5 text-sm text-slate-500">Création, calendrier et pilotage des élections.</p>
        </div>
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
              Nouveau scrutin
            </>
          )}
        </button>
      </div>

      {/* Formulaire création */}
      {showForm && (
        <form onSubmit={create} className="mb-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Intitulé</label>
              <input className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Description</label>
              <textarea className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Règle de majorité</label>
              <select className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                value={form.majorityRule} onChange={(e) => setForm({ ...form, majorityRule: e.target.value })}>
                <option value="RELATIVE">Majorité relative (1 tour)</option>
                <option value="ABSOLUE">Majorité absolue (2 tours)</option>
              </select>
            </div>
            <div />
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Ouverture du scrutin</label>
              <input type="datetime-local" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} required />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Clôture du scrutin</label>
              <input type="datetime-local" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} required />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                Début dépôt candidatures <span className="font-normal text-slate-400">(facultatif)</span>
              </label>
              <input type="datetime-local" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                value={form.candidacyStartAt} onChange={(e) => setForm({ ...form, candidacyStartAt: e.target.value })} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                Fin dépôt candidatures <span className="font-normal text-slate-400">(facultatif)</span>
              </label>
              <input type="datetime-local" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                value={form.candidacyEndAt} onChange={(e) => setForm({ ...form, candidacyEndAt: e.target.value })} />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-xs font-semibold text-slate-600">Postes à pourvoir</label>
            <div className="space-y-2">
              {positions.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                    placeholder="Intitulé du poste"
                    value={p.title}
                    onChange={(e) => { const next = [...positions]; next[i].title = e.target.value; setPositions(next); }}
                  />
                  <input
                    type="number" min={1}
                    className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                    value={p.seats}
                    onChange={(e) => { const next = [...positions]; next[i].seats = parseInt(e.target.value) || 1; setPositions(next); }}
                  />
                  <button type="button"
                    className="bo-btn bo-btn-ghost bo-btn-sm"
                    onClick={() => setPositions(positions.filter((_, j) => j !== i))}>
                    Retirer
                  </button>
                </div>
              ))}
            </div>
            <button type="button"
              className="mt-2 rounded-xl border border-dashed border-slate-300 px-4 py-2 text-xs font-medium text-slate-500 hover:border-emerald-400 hover:text-emerald-600"
              onClick={() => setPositions([...positions, { title: '', seats: 1 }])}>
              + Ajouter un poste
            </button>
          </div>

          <div className="mt-4">
            <button type="submit" className="bo-btn bo-btn-primary">
              Créer le scrutin
            </button>
          </div>
        </form>
      )}

      {/* Liste */}
      <div className="space-y-4">
        {elections.map((e) => (
          <div key={e.id} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
            <div className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <p className="text-base font-semibold text-slate-900">{e.title}</p>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_COLORS[e.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {STATUS_LABELS[e.status] ?? e.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {e._count.positions} poste(s) · {e._count.voteRecords} votant(s) · {' '}
                    {new Date(e.startAt).toLocaleDateString('fr-FR')} → {new Date(e.endAt).toLocaleDateString('fr-FR')}
                  </p>
                  {(e.candidacyStartAt || e.candidacyEndAt) && (
                    <p className="mt-0.5 text-xs text-blue-500">
                      Candidatures :{' '}
                      {e.candidacyStartAt ? new Date(e.candidacyStartAt).toLocaleDateString('fr-FR') : '—'} → {' '}
                      {e.candidacyEndAt ? new Date(e.candidacyEndAt).toLocaleDateString('fr-FR') : '—'}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {e.status === 'BROUILLON' && (
                  <button onClick={() => setStatus(e.id, 'PLANIFIE')}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    Ouvrir les candidatures
                  </button>
                )}
                {e.status === 'PLANIFIE' && (
                  <button onClick={() => setStatus(e.id, 'OUVERT')}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
                    Ouvrir le scrutin
                  </button>
                )}
                {e.status === 'OUVERT' && (
                  <button onClick={() => setStatus(e.id, 'CLOS')}
                    className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50">
                    Clôturer
                  </button>
                )}
                {e.status === 'CLOS' && (
                  <button
                    type="button"
                    disabled={tallyingId === e.id}
                    onClick={() => runTally(e.id)}
                    className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-60">
                    {tallyingId === e.id ? 'Dépouillement…' : 'Dépouiller'}
                  </button>
                )}
                {e.status === 'DEPOUILLE' && (
                  <button onClick={() => setStatus(e.id, 'PUBLIE')}
                    className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700">
                    Publier les résultats
                  </button>
                )}
                {['BROUILLON', 'PLANIFIE'].includes(e.status) && (
                  <button
                    onClick={() => editingId === e.id ? setEditingId(null) : startEdit(e)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    {editingId === e.id ? 'Annuler' : 'Modifier'}
                  </button>
                )}
                {e.status === 'BROUILLON' && (
                  <button
                    onClick={() => deleteElection(e.id, e.title)}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
                    Supprimer
                  </button>
                )}
              </div>
            </div>

            {editingId === e.id && (
              <form onSubmit={saveEdit} className="border-t border-slate-100 bg-slate-50 p-5 space-y-4">
                {editError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{editError}</div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Intitulé</label>
                    <input className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                      value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} required />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Description</label>
                    <textarea className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                      value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Ouverture du scrutin</label>
                    <input type="datetime-local" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                      value={editForm.startAt} onChange={(e) => setEditForm({ ...editForm, startAt: e.target.value })} required />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Clôture du scrutin</label>
                    <input type="datetime-local" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                      value={editForm.endAt} onChange={(e) => setEditForm({ ...editForm, endAt: e.target.value })} required />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                      Début dépôt candidatures <span className="font-normal text-slate-400">(facultatif)</span>
                    </label>
                    <input type="datetime-local" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                      value={editForm.candidacyStartAt} onChange={(e) => setEditForm({ ...editForm, candidacyStartAt: e.target.value })} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                      Fin dépôt candidatures <span className="font-normal text-slate-400">(facultatif)</span>
                    </label>
                    <input type="datetime-local" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                      value={editForm.candidacyEndAt} onChange={(e) => setEditForm({ ...editForm, candidacyEndAt: e.target.value })} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="bo-btn bo-btn-primary">
                    Enregistrer
                  </button>
                  <button type="button" onClick={() => setEditingId(null)} className="bo-btn bo-btn-ghost">
                    Annuler
                  </button>
                </div>
              </form>
            )}
          </div>
        ))}

        {elections.length === 0 && (
          <div className="rounded-2xl bg-white p-10 text-center text-slate-400 shadow-sm ring-1 ring-slate-100">
            Aucun scrutin. Créez-en un pour commencer.
          </div>
        )}
      </div>
    </BackofficeShell>
  );
}
