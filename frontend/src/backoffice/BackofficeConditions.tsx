import { useEffect, useState, useCallback } from 'react';
import { BackofficeShell } from './BackofficeShell';
import { api } from '../lib/api';

interface Condition {
  id: string;
  text: string;
  order: number;
}

export default function BackofficeConditions() {
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [newText, setNewText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.get<Condition[]>('/candidacies/conditions');
      setConditions(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function addCondition() {
    if (!newText.trim()) return;
    setSaving(true);
    try {
      await api.post('/candidacies/conditions', { text: newText.trim(), order: conditions.length });
      setNewText('');
      await load();
      showToast('Condition ajoutée.');
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(id: string) {
    if (!editText.trim()) return;
    setSaving(true);
    try {
      await api.put(`/candidacies/conditions/${id}`, { text: editText.trim() });
      setEditingId(null);
      await load();
      showToast('Condition mise à jour.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteCondition(id: string) {
    if (!confirm('Supprimer cette condition ?')) return;
    await api.delete(`/candidacies/conditions/${id}`);
    await load();
    showToast('Condition supprimée.');
  }

  function startEdit(c: Condition) {
    setEditingId(c.id);
    setEditText(c.text);
  }

  return (
    <BackofficeShell>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900">Conditions de candidature</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Définissez les critères que les candidats doivent remplir. Ces conditions s'affichent lors de la soumission d'une candidature et lors de l'examen des dossiers.
        </p>
      </div>

      {/* Formulaire d'ajout */}
      <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <p className="mb-3 text-sm font-semibold text-slate-700">Ajouter une condition</p>
        <div className="flex gap-3">
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCondition()}
            placeholder="Ex : Être membre en règle depuis au moins 2 ans"
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
          <button
            type="button"
            onClick={addCondition}
            disabled={saving || !newText.trim()}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Ajouter
          </button>
        </div>
      </div>

      {/* Liste des conditions */}
      <div className="space-y-2">
        {conditions.length === 0 && (
          <div className="rounded-2xl bg-white p-10 text-center text-slate-400 shadow-sm ring-1 ring-slate-100">
            Aucune condition définie. Ajoutez-en une ci-dessus.
          </div>
        )}

        {conditions.map((c, i) => (
          <div key={c.id} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            {/* Numéro */}
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-xs font-bold text-emerald-600">
              {i + 1}
            </div>

            {/* Texte ou édition */}
            {editingId === c.id ? (
              <div className="flex flex-1 items-center gap-2">
                <input
                  autoFocus
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(c.id); if (e.key === 'Escape') setEditingId(null); }}
                  className="flex-1 rounded-xl border border-emerald-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
                <button
                  type="button"
                  onClick={() => saveEdit(c.id)}
                  disabled={saving}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  Enregistrer
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Annuler
                </button>
              </div>
            ) : (
              <p className="flex-1 text-sm text-slate-700">{c.text}</p>
            )}

            {/* Actions */}
            {editingId !== c.id && (
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => startEdit(c)}
                  title="Modifier"
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => deleteCondition(c.id)}
                  title="Supprimer"
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {conditions.length > 0 && (
        <p className="mt-4 text-xs text-slate-400">
          {conditions.length} condition{conditions.length > 1 ? 's' : ''} définie{conditions.length > 1 ? 's' : ''} pour votre organisation.
        </p>
      )}
    </BackofficeShell>
  );
}
