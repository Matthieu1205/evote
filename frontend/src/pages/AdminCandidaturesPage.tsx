import { useEffect, useState, useCallback } from 'react';
import { AppShell } from '../components/AppShell';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../lib/api';

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

export default function AdminCandidaturesPage() {
  const [items, setItems] = useState<Candidacy[]>([]);
  const [filter, setFilter] = useState('SOUMISE');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const url = filter ? `/candidacies?status=${filter}` : '/candidacies';
      const data = await api.get<{ data: Candidacy[] }>(url);
      setItems(data.data ?? []);
    } catch { /* ignore */ }
  }, [filter]);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => { load(); }, [load]);

  async function validate(id: string) {
    setActionError(null);
    try {
      await api.put(`/candidacies/${id}/validate`, {});
      showToast('Candidature validée avec succès.');
      load();
    } catch (err) {
      setActionError((err as Error).message ?? 'Erreur lors de la validation.');
    }
  }

  async function reject(id: string) {
    setActionError(null);
    try {
      await api.put(`/candidacies/${id}/reject`, { reviewNote: rejectNote || undefined });
      setRejectingId(null);
      setRejectNote('');
      showToast('Candidature rejetée.');
      load();
    } catch (err) {
      setActionError((err as Error).message ?? 'Erreur lors du rejet.');
    }
  }

  return (
    <AppShell>
      <h1 className="text-3xl font-bold text-ink-900">Validation des candidatures</h1>
      <p className="mt-1 text-ink-500">Examen des dossiers par la commission électorale.</p>

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 rounded-xl px-5 py-3 text-sm font-medium text-white shadow-lg transition ${toast.ok ? 'bg-brand-600 border border-brand-200' : 'bg-red-600 border border-red-400'}`}>
          {toast.msg}
        </div>
      )}

      {actionError && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {actionError}
        </div>
      )}

      <div className="mt-6 flex gap-2">
        {[
          { k: 'SOUMISE', l: 'À examiner' },
          { k: 'VALIDEE', l: 'Validées' },
          { k: 'REJETEE', l: 'Rejetées' },
          { k: '', l: 'Toutes' },
        ].map((f) => (
          <button
            key={f.k}
            type="button"
            onClick={() => setFilter(f.k)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              filter === f.k
                ? 'bg-brand-600 text-white'
                : 'border border-ink-200 bg-white text-ink-600'
            }`}
          >
            {f.l}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {items.map((c) => (
          <div key={c.id} className="card overflow-hidden p-0">
            <div className="flex flex-wrap items-start gap-4 p-5">
              {c.photoUrl ? (
                <img
                  src={c.photoUrl}
                  alt={`${c.user.firstName} ${c.user.lastName}`}
                  className="h-16 w-16 shrink-0 rounded-xl object-cover border border-ink-200"
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-xl font-bold text-brand-500">
                  {c.user.firstName[0] ?? ''}{c.user.lastName[0] ?? ''}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-ink-900">
                      {c.user.firstName} {c.user.lastName}
                      {c.profession && (
                        <span className="ml-2 text-sm font-normal text-brand-600">· {c.profession}</span>
                      )}
                      {c.age && (
                        <span className="ml-2 text-sm font-normal text-ink-400">{c.age} ans</span>
                      )}
                    </div>
                    <div className="text-xs text-ink-400">
                      {c.user.ordreNumber}
                      {c.user.section ? ` · Section ${c.user.section}` : ''} · Poste : {c.position.title}
                    </div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                {c.program && (
                  <p className="mt-2 line-clamp-2 text-sm text-ink-600">{c.program}</p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
              className="w-full border-t border-ink-100 px-5 py-2 text-left text-xs font-medium text-brand-600 hover:bg-brand-50 transition"
            >
              {expandedId === c.id ? 'Masquer le dossier complet ▲' : 'Voir le dossier complet ▼'}
            </button>

            {expandedId === c.id && (
              <div className="border-t border-ink-100 bg-ink-50 p-5 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {c.videoUrl && (
                    <div>
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">
                        Vidéo de présentation
                      </p>
                      <video
                        controls
                        className="w-full rounded-xl border border-ink-200"
                        style={{ maxHeight: '240px' }}
                        preload="metadata"
                      >
                        <source src={c.videoUrl} />
                      </video>
                    </div>
                  )}
                  {c.biography && (
                    <div>
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">
                        Biographie
                      </p>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-700">
                        {c.biography}
                      </p>
                    </div>
                  )}
                </div>
                {c.program && (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">
                      Profession de foi / Programme
                    </p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-700">
                      {c.program}
                    </p>
                  </div>
                )}
              </div>
            )}

            {c.status === 'SOUMISE' && rejectingId !== c.id && (
              <div className="border-t border-ink-100 p-5 flex gap-2">
                <button type="button" className="btn-primary" onClick={() => validate(c.id)}>
                  Valider
                </button>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => { setRejectingId(c.id); setRejectNote(''); }}
                >
                  Rejeter
                </button>
              </div>
            )}

            {rejectingId === c.id && (
              <div className="border-t border-ink-100 p-5">
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <label className="block text-sm font-medium text-red-800">Motif du rejet</label>
                  <textarea
                    autoFocus
                    className="mt-2 w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm text-ink-900 focus:border-red-500 focus:outline-none"
                    rows={3}
                    placeholder="Expliquez le motif du rejet (visible par le candidat)…"
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                  />
                  <div className="mt-3 flex gap-2">
                    <button type="button" className="btn-danger" onClick={() => reject(c.id)}>
                      Confirmer le rejet
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => setRejectingId(null)}
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {items.length === 0 && (
          <div className="card p-8 text-center text-ink-400">
            Aucune candidature dans cette catégorie.
          </div>
        )}
      </div>
    </AppShell>
  );
}
