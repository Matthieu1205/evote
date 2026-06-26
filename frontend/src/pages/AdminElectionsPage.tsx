import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../lib/api';

interface Election {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  startAt: string;
  endAt: string;
  majorityRule: string;
  _count: { positions: number; ballots: number; voteRecords: number };
}

interface PosForm {
  title: string;
  seats: number;
}

function toLocalDatetimeValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminElectionsPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    majorityRule: 'RELATIVE',
    startAt: '',
    endAt: '',
  });
  const [positions, setPositions] = useState<PosForm[]>([{ title: '', seats: 1 }]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', startAt: '', endAt: '' });
  const [editError, setEditError] = useState<string | null>(null);
  const [tallyingId, setTallyingId] = useState<string | null>(null);

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
        ...form,
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
        positions: positions.filter((p) => p.title.trim()),
      });
      setShowForm(false);
      setForm({ title: '', description: '', majorityRule: 'RELATIVE', startAt: '', endAt: '' });
      setPositions([{ title: '', seats: 1 }]);
      load();
    } catch (err) {
      setError((err as Error).message ?? 'Erreur');
    }
  }

  async function setStatus(id: string, status: string) {
    await api.put(`/elections/${id}/status`, { status });
    load();
  }

  function startEdit(e: Election) {
    setEditingId(e.id);
    setEditError(null);
    setEditForm({
      title: e.title,
      description: e.description ?? '',
      startAt: toLocalDatetimeValue(e.startAt),
      endAt: toLocalDatetimeValue(e.endAt),
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
      });
      setEditingId(null);
      load();
    } catch (err) {
      setEditError((err as Error).message ?? 'Erreur');
    }
  }

  async function runTally(id: string, publish: boolean) {
    const msg = publish
      ? 'Dépouiller et publier les résultats immédiatement ?'
      : 'Lancer le dépouillement ? Les résultats resteront privés jusqu\'à publication.';
    if (!confirm(msg)) return;
    setTallyingId(id);
    try {
      await api.post(`/elections/${id}/tally`, { publish });
      load();
    } catch (err) {
      alert((err as Error).message ?? 'Erreur lors du dépouillement');
    } finally {
      setTallyingId(null);
    }
  }

  async function deleteElection(id: string, title: string) {
    if (!confirm(`Supprimer définitivement le scrutin "${title}" ?`)) return;
    await api.delete(`/elections/${id}`);
    load();
  }

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-ink-900">Scrutins</h1>
          <p className="mt-1 text-ink-500">Création, calendrier et pilotage des élections.</p>
        </div>
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
              Nouveau scrutin
            </>
          )}
        </button>
      </div>

      {/* Formulaire de création */}
      {showForm && (
        <form onSubmit={create} className="card mt-6 p-6">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Intitulé</label>
              <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <textarea className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="label">Règle de majorité</label>
              <select className="input" value={form.majorityRule} onChange={(e) => setForm({ ...form, majorityRule: e.target.value })}>
                <option value="RELATIVE">Majorité relative (1 tour)</option>
                <option value="ABSOLUE">Majorité absolue (2 tours)</option>
              </select>
            </div>
            <div />
            <div>
              <label className="label">Ouverture</label>
              <input type="datetime-local" className="input" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} required />
            </div>
            <div>
              <label className="label">Clôture</label>
              <input type="datetime-local" className="input" value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} required />
            </div>
          </div>

          <div className="mt-6">
            <label className="label">Postes à pourvoir</label>
            <div className="space-y-2">
              {positions.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className="input flex-1"
                    placeholder="Intitulé du poste"
                    value={p.title}
                    onChange={(e) => { const next = [...positions]; next[i].title = e.target.value; setPositions(next); }}
                  />
                  <input
                    type="number" min={1} className="input w-24" value={p.seats}
                    onChange={(e) => { const next = [...positions]; next[i].seats = parseInt(e.target.value) || 1; setPositions(next); }}
                  />
                  <button type="button" className="btn-ghost px-3"
                    onClick={() => setPositions(positions.filter((_, j) => j !== i))}>
                    Retirer
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className="btn-ghost mt-2"
              onClick={() => setPositions([...positions, { title: '', seats: 1 }])}>
              Ajouter un poste
            </button>
          </div>
          <div className="mt-6">
            <button className="btn-primary">Créer le scrutin</button>
          </div>
        </form>
      )}

      {/* Liste des scrutins */}
      <div className="mt-6 space-y-4">
        {elections.map((e) => (
          <div key={e.id} className="card overflow-hidden p-0">
            <div className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold text-ink-900">{e.title}</p>
                  <div className="mt-1 text-xs text-ink-400">
                    {e._count.positions} poste(s) · {e._count.voteRecords} votant(s) ·{' '}
                    {new Date(e.startAt).toLocaleDateString('fr-FR')} →{' '}
                    {new Date(e.endAt).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <StatusBadge status={e.status} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {e.status === 'BROUILLON' && (
                  <button className="btn-ghost" onClick={() => setStatus(e.id, 'PLANIFIE')}>
                    Ouvrir les candidatures
                  </button>
                )}
                {e.status === 'PLANIFIE' && (
                  <button className="btn-primary" onClick={() => setStatus(e.id, 'OUVERT')}>
                    Ouvrir le scrutin
                  </button>
                )}
                {e.status === 'OUVERT' && (
                  <button className="btn-ghost" onClick={() => setStatus(e.id, 'CLOS')}>
                    Clôturer
                  </button>
                )}
                {e.status === 'OUVERT' && (
                  <Link
                    to={`/vote/${e.id}/live`}
                    className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    Résultats en direct
                  </Link>
                )}
                {e.status === 'CLOS' && (
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={tallyingId === e.id}
                    onClick={() => runTally(e.id, false)}
                  >
                    {tallyingId === e.id ? 'Dépouillement…' : 'Dépouiller'}
                  </button>
                )}
                {e.status === 'DEPOUILLE' && (
                  <>
                    <button className="btn-primary" onClick={() => setStatus(e.id, 'PUBLIE')}>
                      Publier les résultats
                    </button>
                    <Link
                      to={`/vote/${e.id}/results`}
                      className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-sm font-medium text-purple-700 transition hover:bg-purple-100"
                    >
                      Aperçu résultats
                    </Link>
                  </>
                )}
                {e.status === 'PUBLIE' && (
                  <Link
                    to={`/vote/${e.id}/results`}
                    className="inline-flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-700 transition hover:bg-teal-100"
                  >
                    Voir les résultats publiés
                  </Link>
                )}
                <Link to={`/vote/${e.id}`} className="btn-ghost">Aperçu</Link>

                {['BROUILLON', 'PLANIFIE'].includes(e.status) && (
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => editingId === e.id ? setEditingId(null) : startEdit(e)}
                  >
                    {editingId === e.id ? 'Annuler' : 'Modifier'}
                  </button>
                )}

                {e.status === 'BROUILLON' && (
                  <button
                    type="button"
                    onClick={() => deleteElection(e.id, e.title)}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                  >
                    Supprimer
                  </button>
                )}
              </div>
            </div>

            {editingId === e.id && (
              <form onSubmit={saveEdit} className="border-t border-ink-100 bg-ink-50 p-6 space-y-4">
                {editError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                    {editError}
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="label">Intitulé</label>
                    <input className="input" value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} required />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Description</label>
                    <textarea className="input" value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Ouverture</label>
                    <input type="datetime-local" className="input" value={editForm.startAt}
                      onChange={(e) => setEditForm({ ...editForm, startAt: e.target.value })} required />
                  </div>
                  <div>
                    <label className="label">Clôture</label>
                    <input type="datetime-local" className="input" value={editForm.endAt}
                      onChange={(e) => setEditForm({ ...editForm, endAt: e.target.value })} required />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary">Enregistrer</button>
                  <button type="button" className="btn-ghost" onClick={() => setEditingId(null)}>Annuler</button>
                </div>
              </form>
            )}
          </div>
        ))}
        {elections.length === 0 && (
          <div className="card p-8 text-center text-ink-400">
            Aucun scrutin. Créez-en un pour commencer.
          </div>
        )}
      </div>
    </AppShell>
  );
}
