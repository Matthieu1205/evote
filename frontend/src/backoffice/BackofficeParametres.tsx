import { useEffect, useState } from 'react';
import { BackofficeShell } from './BackofficeShell';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export default function BackofficeParametres() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    name: '',
    memberLabel: '',
    primaryColor: '',
    logoUrl: '',
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.organization) {
      setForm({
        name: user.organization.name ?? '',
        memberLabel: (user.organization as any).memberLabel ?? '',
        primaryColor: user.organization.primaryColor ?? '#059669',
        logoUrl: user.organization.logoUrl ?? '',
      });
    }
  }, [user]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError("Le fichier doit être une image (PNG, JPG, SVG…).");
      return;
    }
    if (file.size > 1_000_000) {
      setError("Le logo ne doit pas dépasser 1 Mo.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setForm((f) => ({ ...f, logoUrl: result }));
    };
    reader.readAsDataURL(file);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const updated = await api.put<any>('/organizations/me', {
        name: form.name || undefined,
        memberLabel: form.memberLabel || undefined,
        primaryColor: form.primaryColor || undefined,
        logoUrl: form.logoUrl || undefined,
      });
      if (user) {
        setUser({
          ...user,
          organization: {
            ...user.organization,
            name: updated.name,
            primaryColor: updated.primaryColor,
            logoUrl: updated.logoUrl,
          },
        });
      }
      showToast('Paramètres enregistrés avec succès.');
    } catch (err) {
      setError((err as Error).message ?? 'Erreur lors de la sauvegarde.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <BackofficeShell>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900">Paramètres</h1>
        <p className="mt-0.5 text-sm text-slate-500">Personnalisation de votre organisation sur la plateforme.</p>
      </div>

      <div className="max-w-xl">
        <form onSubmit={handleSave} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 space-y-5">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {/* Logo */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">Logo de l'organisation</label>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {form.logoUrl ? (
                  <img src={form.logoUrl} alt="Logo" className="h-full w-full object-contain p-1" />
                ) : (
                  <svg viewBox="0 0 24 24" className="h-8 w-8 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-sm text-slate-500 transition hover:border-emerald-400 hover:text-emerald-600">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  {form.logoUrl ? "Changer le logo" : "Choisir un logo (PNG, SVG, JPG)"}
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
                {form.logoUrl && (
                  <button type="button" onClick={() => setForm((f) => ({ ...f, logoUrl: '' }))}
                    className="mt-1.5 text-xs text-red-500 hover:text-red-700">
                    Supprimer le logo
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Nom */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">Nom de l'organisation</label>
            <input
              type="text"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          {/* Label membre */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Libellé du numéro de membre
              <span className="ml-1 font-normal text-slate-400">(affiché sur la page de connexion)</span>
            </label>
            <input
              type="text"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              value={form.memberLabel}
              onChange={(e) => setForm({ ...form, memberLabel: e.target.value })}
              placeholder="Ex : Numéro de membre, Matricule…"
            />
          </div>

          {/* Couleur */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Couleur principale
              <span className="ml-1 font-normal text-slate-400">(interface de votre organisation)</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                className="h-10 w-14 cursor-pointer rounded-lg border border-slate-200 p-0.5"
                value={form.primaryColor}
                onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
              />
              <input
                type="text"
                className="w-32 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-mono focus:border-emerald-400 focus:outline-none"
                value={form.primaryColor}
                onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                placeholder="#059669"
                pattern="^#[0-9A-Fa-f]{6}$"
              />
              <div
                className="h-10 w-10 rounded-xl border border-slate-200"
                style={{ backgroundColor: form.primaryColor }}
              />
            </div>
          </div>

          <div className="pt-2">
            <button type="submit" disabled={loading} className="bo-btn bo-btn-primary">
              {loading ? 'Enregistrement…' : 'Enregistrer les paramètres'}
            </button>
          </div>
        </form>
      </div>
    </BackofficeShell>
  );
}
