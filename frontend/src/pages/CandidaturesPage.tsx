import { useEffect, useState, useCallback, useRef } from 'react';
import { AppShell } from '../components/AppShell';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

/** Ancienneté en années pleines à partir de la date d'adhésion. */
function seniorityYears(since?: string | null): number | null {
  if (!since) return null;
  const d = new Date(since);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) years--;
  return Math.max(0, years);
}

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
  candidacyStartAt?: string | null;
  candidacyEndAt?: string | null;
  positions: Position[];
}
interface MyCandidacy {
  id: string;
  status: string;
  program?: string | null;
  reviewNote?: string | null;
  photoUrl?: string | null;
  videoUrl?: string | null;
  documentUrl?: string | null;
  profession?: string | null;
  currentRole?: string | null;
  employer?: string | null;
  yearsExperience?: number | null;
  education?: string | null;
  age?: number | null;
  biography?: string | null;
  pastRoles?: string | null;
  motivation?: string | null;
  position: { title: string };
}

type UploadState = { url: string; preview: string } | null;

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  SOUMISE:  { bg: 'bg-amber-100',   text: 'text-amber-700',   label: 'En attente' },
  VALIDEE:  { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Validée' },
  REJETEE:  { bg: 'bg-red-100',     text: 'text-red-700',     label: 'Rejetée' },
  RETIREE:  { bg: 'bg-slate-100',   text: 'text-slate-500',   label: 'Retirée' },
};

function FileUploadField({ label, accept, type, value, onChange }: {
  label: string; accept: string; type: 'photo' | 'video' | 'document';
  value: UploadState; onChange: (v: UploadState) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleFile(file: File) {
    setErr(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('type', type);
      const data = await api.postForm<{ url: string }>('/upload', form);
      onChange({ url: data.url, preview: URL.createObjectURL(file) });
    } catch (e) {
      setErr((e as Error).message ?? "Erreur lors de l'envoi");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-ink-600">{label}</label>
      {value ? (
        <div className="relative inline-block">
          {type === 'photo' ? (
            <img src={value.preview} alt="Aperçu" className="h-32 w-32 rounded-2xl border border-ink-200 object-cover" />
          ) : type === 'video' ? (
            <video src={value.preview} className="h-32 rounded-2xl border border-ink-200" controls />
          ) : (
            <a href={value.preview} target="_blank" rel="noreferrer"
              className="flex h-32 w-40 flex-col items-center justify-center gap-2 rounded-2xl border border-ink-200 bg-ink-50 text-sm font-medium text-brand-600 hover:bg-brand-50">
              <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
              </svg>
              Voir le PDF
            </a>
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
                ) : type === 'video' ? (
                  <><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></>
                ) : (
                  <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></>
                )}
              </svg>
              <span className="mt-1.5 text-sm font-medium text-ink-600">
                {type === 'photo' ? 'Choisir une photo' : type === 'video' ? 'Ajouter une vidéo' : 'Ajouter un document'}
              </span>
              <span className="mt-0.5 text-xs text-ink-400">
                {type === 'photo' ? 'JPG, PNG, WEBP · max 5 Mo' : type === 'video' ? 'MP4, WEBM · max 80 Mo' : 'PDF · max 10 Mo'}
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
  const { user } = useAuth();
  const [elections, setElections] = useState<Election[]>([]);
  const [allPublicElections, setAllPublicElections] = useState<Election[]>([]);
  const [mine, setMine] = useState<MyCandidacy[]>([]);
  const [positionId, setPositionId] = useState('');
  const [program, setProgram] = useState('');
  const [profession, setProfession] = useState('');
  const [currentRole, setCurrentRole] = useState('');
  const [employer, setEmployer] = useState('');
  const [pastRoles, setPastRoles] = useState('');
  const [motivation, setMotivation] = useState('');
  const [age, setAge] = useState('');
  const [biography, setBiography] = useState('');
  const [photo, setPhoto] = useState<UploadState>(null);
  const [video, setVideo] = useState<UploadState>(null);
  const [docFile, setDocFile] = useState<UploadState>(null);
  const [conditions, setConditions] = useState<{ id: string; text: string }[]>([]);
  const [acceptConditions, setAcceptConditions] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [er, cr, conds] = await Promise.all([
        api.get<{ data: Election[] }>('/elections'),
        api.get<{ data: MyCandidacy[] }>('/candidacies'),
        api.get<{ id: string; text: string }[]>('/candidacies/conditions').catch(() => []),
      ]);
      setConditions(conds ?? []);

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
      setLoadError(null);
    } catch (err) {
      setLoadError((err as Error).message ?? 'Erreur lors du chargement des candidatures.');
    }
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

  function resetForm() {
    setProgram(''); setProfession(''); setAge(''); setBiography('');
    setCurrentRole(''); setEmployer('');
    setPastRoles(''); setMotivation('');
    setPhoto(null); setVideo(null); setDocFile(null);
    setPositionId(''); setAcceptConditions(false); setEditingId(null);
  }

  function startEdit(c: MyCandidacy) {
    setEditingId(c.id);
    setProgram(c.program ?? '');
    setProfession(c.profession ?? '');
    setCurrentRole(c.currentRole ?? '');
    setEmployer(c.employer ?? '');
    setPastRoles(c.pastRoles ?? '');
    setMotivation(c.motivation ?? '');
    setAge(c.age ? String(c.age) : '');
    setBiography(c.biography ?? '');
    setPhoto(c.photoUrl ? { url: c.photoUrl, preview: c.photoUrl } : null);
    setVideo(c.videoUrl ? { url: c.videoUrl, preview: c.videoUrl } : null);
    setDocFile(c.documentUrl ? { url: c.documentUrl, preview: c.documentUrl } : null);
    setMessage(null); setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!editingId && conditions.length > 0 && !acceptConditions) {
      setError('Vous devez certifier remplir les conditions de candidature.');
      return;
    }
    setLoading(true);
    try {
      if (editingId) {
        await api.put(`/candidacies/${editingId}`, {
          program,
          profession: profession || null,
          currentRole: currentRole || null,
          employer: employer || null,
          age: age ? parseInt(age, 10) : null,
          biography: biography || null,
          pastRoles: pastRoles || null,
          motivation: motivation || null,
          photoUrl: photo?.url ?? null,
          videoUrl: video?.url ?? null,
          documentUrl: docFile?.url ?? null,
        });
        setMessage('Candidature mise à jour.');
      } else {
        await api.post('/candidacies', {
          positionId,
          program,
          profession: profession || undefined,
          currentRole: currentRole || undefined,
          employer: employer || undefined,
          age: age ? parseInt(age, 10) : undefined,
          biography: biography || undefined,
          pastRoles: pastRoles || undefined,
          motivation: motivation || undefined,
          photoUrl: photo?.url,
          videoUrl: video?.url,
          documentUrl: docFile?.url,
          acceptConditions,
        });
        setMessage('Candidature soumise. Elle sera examinée par la commission.');
      }
      resetForm();
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

      {loadError && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
          <button type="button" onClick={load} className="ml-auto font-semibold underline">Réessayer</button>
        </div>
      )}

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
              <>
                {elections.map((el) => {
                  const now = new Date();
                  const start = el.candidacyStartAt ? new Date(el.candidacyStartAt) : null;
                  const end = el.candidacyEndAt ? new Date(el.candidacyEndAt) : null;
                  if (!start && !end) return null;
                  const notYet = start && now < start;
                  const closed = end && now > end;
                  return (
                    <div key={el.id} className={`mb-4 flex items-start gap-3 rounded-xl px-4 py-3 text-sm ${closed ? 'bg-red-50 text-red-700' : notYet ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                      <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span>
                        <strong>{el.title}</strong> —{' '}
                        {closed
                          ? `Dépôt clôturé le ${end!.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}.`
                          : notYet
                          ? `Dépôt ouvrira le ${start!.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}.`
                          : end
                          ? `Dépôt jusqu'au ${end.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}.`
                          : `Dépôt ouvert depuis le ${start!.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}.`}
                      </span>
                    </div>
                  );
                })}
              </>
            )}
            {elections.length > 0 && (
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

                {/* Fiche membre (lecture seule — reprise du dossier membre) */}
                <div className="rounded-2xl border border-ink-200 bg-ink-50 p-4">
                  <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-ink-400">Votre fiche membre</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div><span className="text-ink-400">Ancienneté : </span><span className="font-medium text-ink-800">{seniorityYears(user?.membershipDate) != null ? `${seniorityYears(user?.membershipDate)} an(s)` : '—'}</span></div>
                    <div><span className="text-ink-400">Cotisations : </span>{user?.duesUpToDate ? <span className="font-medium text-emerald-600">À jour</span> : <span className="font-medium text-red-500">Non à jour</span>}</div>
                    <div><span className="text-ink-400">Section : </span><span className="font-medium text-ink-800">{user?.section || '—'}</span></div>
                    <div><span className="text-ink-400">Région : </span><span className="font-medium text-ink-800">{user?.region || '—'}</span></div>
                  </div>
                  <p className="mt-2 text-xs text-ink-400">Ces informations proviennent de votre dossier membre. Pour les corriger, contactez l'administration.</p>
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
                      placeholder="Ex : Médecin, Avocat, Ingénieur…" value={profession} onChange={(e) => setProfession(e.target.value)} maxLength={120} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-ink-600">Âge</label>
                    <input type="number" className="w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                      placeholder="Ex : 42" value={age} onChange={(e) => setAge(e.target.value)} min={18} max={120} />
                  </div>
                </div>

                {/* Parcours professionnel */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-ink-600">Fonction actuelle</label>
                    <input type="text" className="w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                      placeholder="Ex : Directeur, Responsable…" value={currentRole} onChange={(e) => setCurrentRole(e.target.value)} maxLength={120} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-ink-600">Employeur / structure</label>
                    <input type="text" className="w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                      placeholder="Ex : Hôpital Central" value={employer} onChange={(e) => setEmployer(e.target.value)} maxLength={120} />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-ink-600">Biographie</label>
                  <textarea className="w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    rows={3} value={biography} onChange={(e) => setBiography(e.target.value)}
                    placeholder="Parcours, expérience, engagements…" maxLength={2000} />
                  <p className="mt-0.5 text-right text-xs text-ink-400">{biography.length}/2000</p>
                </div>

                {/* Séparateur engagement */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 border-t border-ink-100" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-ink-400">Engagement associatif</span>
                  <div className="flex-1 border-t border-ink-100" />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-ink-600">Mandats / responsabilités déjà exercés</label>
                  <textarea className="w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    rows={2} value={pastRoles} onChange={(e) => setPastRoles(e.target.value)}
                    placeholder="Ex : Trésorier 2020-2022, membre du bureau…" maxLength={1000} />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-ink-600">Motivations</label>
                  <textarea className="w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    rows={3} value={motivation} onChange={(e) => setMotivation(e.target.value)}
                    placeholder="Pourquoi vous présentez-vous ?" maxLength={1500} />
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

                <FileUploadField label="Programme / document (PDF, facultatif)" accept="application/pdf" type="document" value={docFile} onChange={setDocFile} />

                {/* Attestation des conditions (dépôt initial uniquement) */}
                {!editingId && conditions.length > 0 && (
                  <div className="rounded-2xl border border-ink-200 bg-ink-50 p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Conditions de candidature</p>
                    <ul className="mb-3 list-disc space-y-1 pl-5 text-sm text-ink-700">
                      {conditions.map((c) => <li key={c.id}>{c.text}</li>)}
                    </ul>
                    <label className="flex cursor-pointer items-start gap-2 text-sm text-ink-700">
                      <input type="checkbox" checked={acceptConditions}
                        onChange={(e) => setAcceptConditions(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500" />
                      <span>Je certifie sur l'honneur remplir l'ensemble des conditions ci-dessus.</span>
                    </label>
                  </div>
                )}

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
                  ) : editingId ? 'Enregistrer les modifications' : 'Soumettre ma candidature'}
                </button>

                {editingId && (
                  <button type="button" onClick={resetForm}
                    className="w-full rounded-xl border border-ink-200 py-2.5 text-sm font-medium text-ink-600 transition hover:bg-ink-50">
                    Annuler la modification
                  </button>
                )}
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
                    <div className="mt-3 flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => startEdit(c)}
                        className="text-xs font-medium text-brand-600 transition hover:text-brand-700"
                      >
                        ✎ Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => withdraw(c.id)}
                        disabled={withdrawing === c.id}
                        className="text-xs font-medium text-red-500 transition hover:text-red-700 disabled:opacity-50"
                      >
                        {withdrawing === c.id ? 'Retrait…' : '× Retirer cette candidature'}
                      </button>
                    </div>
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
