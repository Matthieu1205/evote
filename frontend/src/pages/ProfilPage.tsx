import { useRef, useState } from 'react';
import { AppShell } from '../components/AppShell';
import { useAuth } from '../contexts/AuthContext';
import { ROLE_LABELS } from '../lib/rbac';
import { api } from '../lib/api';

const BASE = import.meta.env.PROD ? '/api' : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

const ROLE_COLORS: Record<string, string> = {
  ADMIN:       'bg-red-100 text-red-700',
  COMMISSION:  'bg-purple-100 text-purple-700',
  OBSERVATEUR: 'bg-blue-100 text-blue-700',
  CANDIDAT:    'bg-amber-100 text-amber-700',
  ELECTEUR:    'bg-emerald-100 text-emerald-700',
};

export default function ProfilPage() {
  const { user, setUser } = useAuth();
  const role = user?.role ?? '';
  const fileRef = useRef<HTMLInputElement>(null);

  /* ── Édition profil ── */
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    firstName: user?.firstName ?? '',
    lastName:  user?.lastName  ?? '',
    phone:     user?.phone     ?? '',
    section:   user?.section   ?? '',
    region:    user?.region    ?? '',
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  /* ── Mot de passe ── */
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const initials = user
    ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()
    : '?';

  const avatarUrl = photoPreview ?? user?.photoUrl ?? null;

  /* ── Upload photo ── */
  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${BASE}/upload`, {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      const data = await res.json();
      setUploadedUrl(data.url);
    } catch {
      setSaveError("Erreur lors de l'upload de la photo.");
    } finally {
      setUploading(false);
    }
  }

  /* ── Sauvegarder profil ── */
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(false);
    setSaveLoading(true);
    try {
      const payload: Record<string, string> = { ...form };
      if (uploadedUrl) payload.photoUrl = uploadedUrl;
      const updated = await api.put<any>('/auth/profile', payload);
      if (!user) return;
      setUser({
        ...user,
        firstName: updated.firstName,
        lastName:  updated.lastName,
        name:      `${updated.firstName} ${updated.lastName}`,
        phone:     updated.phone,
        section:   updated.section,
        region:    updated.region,
        photoUrl:  updated.photoUrl,
      });
      setSaveSuccess(true);
      setEditing(false);
      setPhotoPreview(null);
      setUploadedUrl(null);
    } catch (err) {
      setSaveError((err as Error).message ?? 'Erreur lors de la sauvegarde.');
    } finally {
      setSaveLoading(false);
    }
  }

  function startEdit() {
    setForm({
      firstName: user?.firstName ?? '',
      lastName:  user?.lastName  ?? '',
      phone:     user?.phone     ?? '',
      section:   user?.section   ?? '',
      region:    user?.region    ?? '',
    });
    setSaveError(null);
    setSaveSuccess(false);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setPhotoPreview(null);
    setUploadedUrl(null);
    setSaveError(null);
  }

  /* ── Changer mot de passe ── */
  async function handlePwd(e: React.FormEvent) {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(false);
    if (newPassword !== confirm) { setPwdError('Les mots de passe ne correspondent pas.'); return; }
    if (newPassword.length < 8)  { setPwdError('Au moins 8 caractères requis.'); return; }
    setPwdLoading(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      setPwdSuccess(true);
      setCurrentPassword(''); setNewPassword(''); setConfirm('');
    } catch (err) {
      setPwdError((err as Error).message ?? 'Une erreur est survenue.');
    } finally {
      setPwdLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-6">

        {/* ── Carte identité ── */}
        {user && (
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-ink-100">
            {/* Bandeau */}
            <div className="h-28 bg-gradient-to-r from-brand-600 to-brand-500" />

            <div className="relative px-6 pb-6">
              {/* Avatar cliquable */}
              <div className="absolute -top-12">
                <div
                  className="relative h-24 w-24 cursor-pointer"
                  onClick={() => editing && fileRef.current?.click()}
                  title={editing ? 'Changer la photo' : ''}
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={user.name}
                      className="h-24 w-24 rounded-2xl object-cover shadow-md ring-4 ring-white"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white text-3xl font-black text-brand-700 shadow-md ring-4 ring-white">
                      {initials}
                    </div>
                  )}
                  {editing && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40">
                      {uploading ? (
                        <svg className="h-6 w-6 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                          <circle cx="12" cy="13" r="4" />
                        </svg>
                      )}
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </div>

              {/* Badge rôle + bouton éditer */}
              <div className="flex items-center justify-end gap-2 pt-3">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ROLE_COLORS[role] ?? 'bg-ink-100 text-ink-600'}`}>
                  {ROLE_LABELS[role] ?? role}
                </span>
                {!editing && (
                  <button onClick={startEdit}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1 text-xs font-semibold text-ink-600 transition hover:border-brand-300 hover:text-brand-600">
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Modifier
                  </button>
                )}
              </div>

              {/* Nom + N° Ordre */}
              <div className="mt-2">
                <h1 className="text-xl font-black text-ink-900">{user.name}</h1>
                <p className="mt-0.5 font-mono text-sm text-ink-400">{user.ordreNumber}</p>
              </div>

              {/* Infos non-éditables */}
              <div className="mt-4 divide-y divide-ink-50">
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-ink-500">Email</span>
                  <span className="text-sm font-medium text-ink-900">{user.email}</span>
                </div>
              </div>

              {/* Formulaire d'édition */}
              {editing ? (
                <form onSubmit={handleSave} className="mt-4 space-y-4">
                  {saveError && (
                    <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{saveError}</div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-ink-600">Prénom</label>
                      <input className="input" value={form.firstName}
                        onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-ink-600">Nom</label>
                      <input className="input" value={form.lastName}
                        onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-ink-600">Téléphone</label>
                      <input className="input" value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+225 XX XX XX XX XX" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-ink-600">Section</label>
                      <input className="input" value={form.section}
                        onChange={(e) => setForm({ ...form, section: e.target.value })} placeholder="A, B, C…" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-xs font-semibold text-ink-600">Région</label>
                      <input className="input" value={form.region}
                        onChange={(e) => setForm({ ...form, region: e.target.value })} placeholder="Abidjan, Bouaké…" />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="submit" disabled={saveLoading || uploading}
                      className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60">
                      {saveLoading ? (
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : null}
                      Enregistrer
                    </button>
                    <button type="button" onClick={cancelEdit}
                      className="rounded-xl border border-ink-200 px-5 py-2.5 text-sm font-semibold text-ink-600 transition hover:bg-ink-50">
                      Annuler
                    </button>
                  </div>
                </form>
              ) : (
                <div className="mt-2 divide-y divide-ink-50">
                  {saveSuccess && (
                    <div className="mb-3 flex items-center gap-2 rounded-xl bg-brand-50 px-4 py-3 text-sm font-medium text-brand-700">
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M5 12l5 5L20 7" />
                      </svg>
                      Profil mis à jour avec succès.
                    </div>
                  )}
                  {[
                    { label: 'Prénom', value: user.firstName },
                    { label: 'Nom', value: user.lastName },
                    { label: 'Téléphone', value: user.phone || '—' },
                    { label: 'Section', value: user.section || '—' },
                    { label: 'Région', value: user.region || '—' },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-4 py-3">
                      <span className="text-sm text-ink-500">{row.label}</span>
                      <span className="text-sm font-medium text-ink-900">{row.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Changement de mot de passe ── */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-ink-100">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-100">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-ink-600" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-ink-900">Changer de mot de passe</h2>
              <p className="text-xs text-ink-400">Minimum 8 caractères</p>
            </div>
          </div>

          {pwdSuccess && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-brand-50 px-4 py-3 text-sm font-medium text-brand-700">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M5 12l5 5L20 7" />
              </svg>
              Mot de passe modifié avec succès.
            </div>
          )}
          {pwdError && (
            <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{pwdError}</div>
          )}

          <form onSubmit={handlePwd} className="space-y-4">
            {[
              { label: 'Mot de passe actuel',           value: currentPassword, setter: setCurrentPassword, show: showCurrent, toggle: () => setShowCurrent((v) => !v) },
              { label: 'Nouveau mot de passe',           value: newPassword,     setter: setNewPassword,     show: showNew,     toggle: () => setShowNew((v) => !v) },
              { label: 'Confirmer le nouveau mot de passe', value: confirm,      setter: setConfirm,         show: showConfirm, toggle: () => setShowConfirm((v) => !v) },
            ].map(({ label, value, setter, show, toggle }) => (
              <div key={label}>
                <label className="mb-1.5 block text-xs font-semibold text-ink-600">{label}</label>
                <div className="relative">
                  <input
                    type={show ? 'text' : 'password'}
                    className="w-full rounded-xl border border-ink-200 py-2.5 pl-4 pr-10 text-sm text-ink-900 placeholder-ink-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    required
                  />
                  <button type="button" onClick={toggle} tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600">
                    {show ? (
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ))}

            <button type="submit" disabled={pwdLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60">
              {pwdLoading ? (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : null}
              Changer le mot de passe
            </button>
          </form>
        </div>

      </div>
    </AppShell>
  );
}
