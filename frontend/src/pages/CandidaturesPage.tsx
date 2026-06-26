import { useEffect, useState, useCallback, useRef } from 'react';
import { AppShell } from '../components/AppShell';
import { api } from '../lib/api';

interface ValidatedCandidate {
  id: string;
  status: string;
  photoUrl?: string | null;
  user: { firstName: string; lastName: string; ordreNumber: string };
}
interface Position {
  id: string;
  title: string;
  seats: number;
  candidacies: ValidatedCandidate[];
}
interface Election {
  id: string;
  title: string;
  status: string;
  positions: Position[];
}
interface MyCandidacy {
  id: string;
  status: string;
  program?: string | null;
  reviewNote?: string | null;
  photoUrl?: string | null;
  videoUrl?: string | null;
  profession?: string | null;
  age?: number | null;
  biography?: string | null;
  position: { title: string };
}

type UploadState = { url: string; preview: string } | null;

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  SOUMISE:  { bg: 'bg-amber-100',   text: 'text-amber-700',   label: 'En attente' },
  VALIDEE:  { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Validée' },
  REJETEE:  { bg: 'bg-red-100',     text: 'text-red-700',     label: 'Rejetée' },
  RETIREE:  { bg: 'bg-slate-100',   text: 'text-slate-500',   label: 'Retirée' },
};

function FileUploadField({ label, accept, type, value, onChange }: {
  label: string; accept: string; type: 'photo' | 'video';
  value: UploadState; onChange: (v: UploadState) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleFile(file: File) {
    setErr(null);
    setUploading(true);
    const form = new FormData();
    form.append('file', file);
    form.append('type', type);
    const res = await fetch(`${BASE}/upload`, { method: 'POST', credentials: 'include', body: form });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) {
      setErr((data as { error?: string }).error ?? "Erreur lors de l'envoi");
      return;
    }
    onChange({ url: (data as { url: string }).url, preview: URL.createObjectURL(file) });
  }

  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-ink-600">{label}</label>
      {value ? (
        <div className="relative inline-block">
          {type === 'photo' ? (
            <img src={value.preview} alt="Aperçu" className="h-32 w-32 rounded-2xl border border-ink-200 object-cover" />
          ) : (
            <video src={value.preview} className="h-32 rounded-2xl border border-ink-200" controls />
          )}
          <button
            type="button"
            onClick={() => { onChange(null); if (inputRef.current) inputRef.current.value = ''; }}
            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600 text-sm font-bold"
          >
            ×
          </button>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-ink-200 bg-ink-50 px-4 py-5 text-center transition hover:border-brand-400 hover:bg-brand-50">
          {uploading ? (
            <span className="text-sm font-medium text-brand-600">Envoi en cours…</span>
          ) : (
            <>
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-ink-400" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                {type === 'photo' ? (
                  <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></>
                ) : (
                  <><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></>
                )}
              </svg>
              <span className="mt-1.5 text-sm font-medium text-ink-600">
                {type === 'photo' ? 'Choisir une photo' : 'Ajouter une vidéo'}
              </span>
              <span className="mt-0.5 text-xs text-ink-400">
                {type === 'photo' ? 'JPG, PNG, WEBP · max 5 Mo' : 'MP4, WEBM · max 80 Mo'}
              </span>
            </>
          )}
          <input ref={inputRef} type="file" accept={accept} className="hidden" disabled={uploading}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </label>
      )}
      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
    </div>
  );
}

export default function CandidaturesPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [allPublicElections, setAllPublicElections] = useState<Election[]>([]);
  const [mine, setMine] = useState<MyCandidacy[]>([]);
  const [positionId, setPositionId] = useState('');
  const [program, setProgram] = useState('');
  const [profession, setProfession] = useState('');
  const [age, setAge] = useState('');
  const [biography, setBiography] = useState('');
  const [photo, setPhoto] = useState<UploadState>(null);
  const [video, setVideo] = useState<UploadState>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [er, cr] = await Promise.all([
        api.get<{ data: Election[] }>('/elections'),
        api.get<{ data: MyCandidacy[] }>('/candidacies'),
      ]);

      const candidatureOpen: Election[] = [];
      const publicElections: Election[] = [];

      for (const e of er.data ?? []) {
        if (['BROUILLON', 'PLANIFIE'].includes(e.status)) {
          try {
            const full = await api.get<Election>(`/elections/${e.id}`);
            candidatureOpen.push(full);
            publicElections.push(full);
          } catch { /* ignore */ }
        }
        if (['OUVERT', 'CLOS', 'DEPOUILLE', 'PUBLIE'].includes(e.status)) {
          try {
            const full = await api.get<Election>(`/elections/${e.id}`);
            publicElections.push(full);
          } catch { /* ignore */ }
        }
      }

      setElections(candidatureOpen);
      setAllPublicElections(publicElections);
      setMine(cr.data ?? []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function withdraw(id: string) {
    if (!confirm('Confirmer le retrait de cette candidature ?')) return;
    setWithdrawing(id);
    try {
      await api.put(`/candidacies/${id}/withdraw`);
      setMessage('Candidature retirée.');
      load();
    } catch (err) {
      setError((err as Error).message ?? 'Erreur lors du retrait.');
    } finally {
      setWithdrawing(null);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      await api.post('/candidacies', {
        positionId,
        program,
        profession: profession || undefined,
        age: age ? parseInt(age, 10) : undefined,
        biography: biography || undefined,
        photoUrl: photo?.url,
        videoUrl: video?.url,
      });
      setMessage('Candidature soumise. Elle sera examinée par la commission.');
      setProgram(''); setProfession(''); setAge(''); setBiography('');
      setPhoto(null); setVideo(null); setPositionId('');
      load();
    } catch (err) {
      setError((err as Error).message ?? 'Erreur lors de la soumission.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-ink-900">Candidatures</h1>
        <p className="mt-1 text-sm text-ink-500">Déposez votre candidature et suivez son traitement.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Formulaire */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-ink-100">
          <div className="border-b border-ink-100 px-6 py-4">
            <h2 className="font-bold text-ink-900">Déposer une candidature</h2>
          </div>

          <div className="p-6">
            {message && (
              <div className="mb-4 flex items-start gap-2 rounded-xl bg-brand-50 px-4 py-3 text-sm font-medium text-brand-700">
                <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12l5 5L20 7" /></svg>
                {message}
              </div>
            )}
            {error && (
              <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            {elections.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-100">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 text-ink-400" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                  </svg>
                </div>
                <p className="mt-3 text-sm font-medium text-ink-500">Aucun scrutin n'accepte de candidatures.</p>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-5">
                {/* Poste */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-ink-600">Poste visé</label>
                  <select
                    aria-label="Poste visé"
                    className="w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm text-ink-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    value={positionId}
                    onChange={(e) => setPositionId(e.target.value)}
                    required
                  >
                    <option value="">Sélectionnez un poste…</option>
                    {elections.map((el) => (
                      <optgroup key={el.id} label={el.title}>
                        {el.positions.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title} ({p.seats} siège{p.seats > 1 ? 's' : ''})
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* Séparateur section profil */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 border-t border-ink-100" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-ink-400">Profil candidat</span>
                  <div className="flex-1 border-t border-ink-100" />
                </div>

                <FileUploadField label="Photo de profil" accept="image/jpeg,image/png,image/webp" type="photo" value={photo} onChange={setPhoto} />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-ink-600">Profession</label>
                    <input type="text" className="w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                      placeholder="Ex : Pharmacien titulaire" value={profession} onChange={(e) => setProfession(e.target.value)} maxLength={120} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-ink-600">Âge</label>
                    <input type="number" className="w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                      placeholder="Ex : 42" value={age} onChange={(e) => setAge(e.target.value)} min={18} max={120} />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-ink-600">Biographie</label>
                  <textarea className="w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    rows={3} value={biography} onChange={(e) => setBiography(e.target.value)}
                    placeholder="Parcours, expérience, engagements…" maxLength={2000} />
                  <p className="mt-0.5 text-right text-xs text-ink-400">{biography.length}/2000</p>
                </div>

                {/* Séparateur section dossier */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 border-t border-ink-100" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-ink-400">Dossier</span>
                  <div className="flex-1 border-t border-ink-100" />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-ink-600">
                    Programme / Profession de foi <span className="text-red-500">*</span>
                  </label>
                  <textarea className="w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    rows={4} value={program} onChange={(e) => setProgram(e.target.value)}
                    placeholder="Présentez votre programme (10 caractères minimum)…" required />
                </div>

                <FileUploadField label="Vidéo de présentation (facultative)" accept="video/mp4,video/webm,video/quicktime" type="video" value={video} onChange={setVideo} />

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Envoi en cours…
                    </>
                  ) : 'Soumettre ma candidature'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Mes candidatures */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-ink-100">
          <div className="border-b border-ink-100 px-6 py-4">
            <h2 className="font-bold text-ink-900">Mes candidatures</h2>
          </div>
          <div className="divide-y divide-ink-50">
            {mine.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-100">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 text-ink-400" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <p className="mt-3 text-sm font-medium text-ink-500">Aucune candidature soumise.</p>
              </div>
            ) : mine.map((c) => {
              const s = STATUS_STYLES[c.status] ?? STATUS_STYLES.SOUMISE;
              return (
                <div key={c.id} className="p-5">
                  <div className="flex items-center gap-3">
                    {c.photoUrl ? (
                      <img src={c.photoUrl} alt="" className="h-10 w-10 shrink-0 rounded-xl border border-ink-100 object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-sm font-bold text-brand-600">
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <circle cx="12" cy="8" r="4" />
                          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                        </svg>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-semibold text-ink-900">{c.position.title}</span>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${s.bg} ${s.text}`}>
                          {s.label}
                        </span>
                      </div>
                      {c.profession && <p className="mt-0.5 text-xs text-ink-400">{c.profession}{c.age ? ` · ${c.age} ans` : ''}</p>}
                    </div>
                  </div>

                  {c.program && (
                    <p className="mt-3 line-clamp-2 rounded-xl bg-ink-50 px-3 py-2 text-xs text-ink-600">{c.program}</p>
                  )}

                  {c.status === 'REJETEE' && c.reviewNote && (
                    <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      <svg viewBox="0 0 24 24" className="mt-0.5 h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span><strong>Motif :</strong> {c.reviewNote}</span>
                    </div>
                  )}

                  {c.status === 'SOUMISE' && (
                    <button
                      type="button"
                      onClick={() => withdraw(c.id)}
                      disabled={withdrawing === c.id}
                      className="mt-3 text-xs font-medium text-red-500 transition hover:text-red-700 disabled:opacity-50"
                    >
                      {withdrawing === c.id ? 'Retrait…' : '× Retirer cette candidature'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Candidats validés */}
      {allPublicElections.some((el) => el.positions.some((p) => p.candidacies.some((c) => c.status === 'VALIDEE'))) && (
        <div className="mt-8">
          <h2 className="text-lg font-bold text-ink-900">Candidats retenus</h2>
          <p className="mt-1 text-sm text-ink-500">Candidatures validées par la commission électorale.</p>

          <div className="mt-5 space-y-5">
            {allPublicElections.map((el) => {
              const validatedPositions = el.positions
                .map((p) => ({ ...p, validated: p.candidacies.filter((c) => c.status === 'VALIDEE') }))
                .filter((p) => p.validated.length > 0);
              if (validatedPositions.length === 0) return null;
              return (
                <div key={el.id} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-ink-100">
                  <div className="border-b border-ink-100 px-6 py-4">
                    <h3 className="font-bold text-ink-900">{el.title}</h3>
                  </div>
                  <div className="divide-y divide-ink-50">
                    {validatedPositions.map((p) => (
                      <div key={p.id} className="px-6 py-4">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">
                          {p.title} · {p.seats} siège{p.seats > 1 ? 's' : ''}
                        </p>
                        <div className="flex flex-wrap gap-3">
                          {p.validated.map((c) => (
                            <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3">
                              {c.photoUrl ? (
                                <img src={c.photoUrl} alt="" className="h-9 w-9 shrink-0 rounded-full border border-brand-200 object-cover" />
                              ) : (
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-200 text-xs font-bold text-brand-700">
                                  {c.user.firstName[0] ?? ''}{c.user.lastName[0] ?? ''}
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-semibold text-ink-900">{c.user.firstName} {c.user.lastName}</p>
                                <p className="text-xs text-ink-400">{c.user.ordreNumber}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </AppShell>
  );
}
