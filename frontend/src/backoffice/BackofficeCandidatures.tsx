import { useEffect, useState, useCallback } from 'react';
import { BackofficeShell } from './BackofficeShell';
import { api } from '../lib/api';

interface Condition {
  id: string;
  text: string;
}

interface Candidacy {
  id: string;
  status: string;
  program?: string | null;
  profession?: string | null;
  age?: number | null;
  biography?: string | null;
  photoUrl?: string | null;
  videoUrl?: string | null;
  user: { firstName: string; lastName: string; ordreNumber: string; section?: string | null };
  position: { title: string };
}

const STATUS_TABS = [
  { k: 'SOUMISE', l: 'À examiner', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  { k: 'VALIDEE', l: 'Validées', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  { k: 'REJETEE', l: 'Rejetées', color: 'text-red-700 bg-red-50 border-red-200' },
  { k: '', l: 'Toutes', color: 'text-slate-700 bg-slate-50 border-slate-200' },
];

export default function BackofficeCandidatures() {
  const [items, setItems] = useState<Candidacy[]>([]);
  const [filter, setFilter] = useState('SOUMISE');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [checkedConditions, setCheckedConditions] = useState<Record<string, Set<string>>>({});

  const load = useCallback(async () => {
    try {
      const url = filter ? `/candidacies?status=${filter}` : '/candidacies';
      const data = await api.get<{ data: Candidacy[] }>(url);
      setItems(data.data ?? []);
    } catch { /* ignore */ }
  }, [filter]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.get<Condition[]>('/candidacies/conditions').then(setConditions).catch(() => {});
  }, []);

  function toggleCondition(candidacyId: string, conditionId: string) {
    setCheckedConditions((prev) => {
      const set = new Set(prev[candidacyId] ?? []);
      if (set.has(conditionId)) set.delete(conditionId); else set.add(conditionId);
      return { ...prev, [candidacyId]: set };
    });
  }

  async function validate(id: string) {
    await api.put(`/candidacies/${id}/validate`, {});
    showToast('Candidature validée.');
    load();
  }

  async function reject(id: string) {
    await api.put(`/candidacies/${id}/reject`, { note: rejectNote });
    setRejectingId(null);
    setRejectNote('');
    showToast('Candidature rejetée.');
    load();
  }

  return (
    <BackofficeShell>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900">Candidatures</h1>
        <p className="mt-0.5 text-sm text-slate-500">Examen et validation des dossiers de candidature.</p>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.k}
            type="button"
            onClick={() => setFilter(tab.k)}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
              filter === tab.k
                ? 'bg-emerald-600 border-emerald-600 text-white'
                : `${tab.color} hover:opacity-80`
            }`}
          >
            {tab.l}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="space-y-4">
        {items.map((c) => {
          const initials = `${c.user.firstName[0] ?? ''}${c.user.lastName[0] ?? ''}`;
          const statusColor =
            c.status === 'VALIDEE' ? 'bg-emerald-100 text-emerald-700' :
            c.status === 'REJETEE' ? 'bg-red-100 text-red-700' :
            'bg-amber-100 text-amber-700';

          return (
            <div key={c.id} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
              {/* Header de la carte */}
              <div className="flex flex-wrap items-start gap-4 p-5">
                {c.photoUrl ? (
                  <img src={c.photoUrl} alt={`${c.user.firstName} ${c.user.lastName}`}
                    className="h-14 w-14 shrink-0 rounded-2xl border border-slate-100 object-cover" />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-lg font-bold text-emerald-700">
                    {initials}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {c.user.firstName} {c.user.lastName}
                        {c.profession && <span className="ml-2 text-sm font-normal text-emerald-600">· {c.profession}</span>}
                        {c.age && <span className="ml-2 text-sm font-normal text-slate-400">{c.age} ans</span>}
                      </p>
                      <p className="text-xs text-slate-400">
                        {c.user.ordreNumber}
                        {c.user.section ? ` · Section ${c.user.section}` : ''}
                        {' '}· Poste : <span className="font-medium text-slate-600">{c.position.title}</span>
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusColor}`}>
                      {c.status}
                    </span>
                  </div>
                  {c.program && (
                    <p className="mt-2 line-clamp-2 text-sm text-slate-500">{c.program}</p>
                  )}
                </div>
              </div>

              {/* Toggle dossier complet */}
              <button
                type="button"
                onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                className="w-full border-t border-slate-100 px-5 py-2.5 text-left text-xs font-semibold text-emerald-600 transition hover:bg-slate-50"
              >
                {expandedId === c.id ? '▲ Masquer le dossier' : '▼ Voir le dossier complet'}
              </button>

              {expandedId === c.id && (
                <div className="border-t border-slate-100 bg-slate-50 p-5 space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {c.videoUrl && (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Vidéo de présentation</p>
                        <video controls className="w-full rounded-xl border border-slate-200" style={{ maxHeight: 220 }} preload="metadata">
                          <source src={c.videoUrl} />
                        </video>
                      </div>
                    )}
                    {c.biography && (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Biographie</p>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{c.biography}</p>
                      </div>
                    )}
                  </div>
                  {c.program && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Programme / Profession de foi</p>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{c.program}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Checklist des conditions (visible lors de l'examen) */}
              {expandedId === c.id && conditions.length > 0 && (
                <div className="border-t border-slate-100 bg-amber-50 px-5 py-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wide text-amber-700">
                    Vérification des conditions
                  </p>
                  <div className="space-y-2">
                    {conditions.map((cond) => {
                      const checked = checkedConditions[c.id]?.has(cond.id) ?? false;
                      return (
                        <label key={cond.id} className="flex cursor-pointer items-start gap-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleCondition(c.id, cond.id)}
                            className="mt-0.5 h-4 w-4 rounded border-amber-300 accent-emerald-600"
                          />
                          <span className={`text-sm ${checked ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                            {cond.text}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {conditions.length > 0 && (
                    <p className="mt-2 text-xs text-amber-600">
                      {checkedConditions[c.id]?.size ?? 0} / {conditions.length} condition{conditions.length > 1 ? 's' : ''} vérifiée{conditions.length > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              {c.status === 'SOUMISE' && rejectingId !== c.id && (
                <div className="flex gap-2 border-t border-slate-100 p-4">
                  <button type="button"
                    onClick={() => validate(c.id)}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Valider
                  </button>
                  <button type="button"
                    onClick={() => { setRejectingId(c.id); setRejectNote(''); }}
                    className="flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    Rejeter
                  </button>
                </div>
              )}

              {rejectingId === c.id && (
                <div className="border-t border-slate-100 p-4">
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                    <label className="block text-sm font-semibold text-red-800">Motif du rejet</label>
                    <textarea
                      autoFocus
                      rows={3}
                      className="mt-2 w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm focus:border-red-400 focus:outline-none"
                      placeholder="Expliquez le motif (visible par le candidat)…"
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                    />
                    <div className="mt-3 flex gap-2">
                      <button type="button" onClick={() => reject(c.id)} className="bo-btn bo-btn-danger">
                        Confirmer le rejet
                      </button>
                      <button type="button" onClick={() => setRejectingId(null)} className="bo-btn bo-btn-ghost">
                        Annuler
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {items.length === 0 && (
          <div className="rounded-2xl bg-white p-10 text-center text-slate-400 shadow-sm ring-1 ring-slate-100">
            Aucune candidature dans cette catégorie.
          </div>
        )}
      </div>
    </BackofficeShell>
  );
}
