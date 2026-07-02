import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

interface Organization {
  id: string;
  slug: string;
  name: string;
  memberLabel: string;
  logoUrl: string | null;
  primaryColor: string | null;
  createdAt: string;
  _count: { users: number };
}

const emptyOrgForm = { slug: '', name: '', memberLabel: '', primaryColor: '' };
const emptyAdminForm = { ordreNumber: '', email: '', firstName: '', lastName: '' };

export default function PlatformOrganizations() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [orgForm, setOrgForm] = useState({ ...emptyOrgForm });
  const [orgError, setOrgError] = useState<string | null>(null);

  const [adminTargetOrg, setAdminTargetOrg] = useState<Organization | null>(null);
  const [adminForm, setAdminForm] = useState({ ...emptyAdminForm });
  const [adminError, setAdminError] = useState<string | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  const load = useCallback(async () => {
    try {
      const data = await api.get<Organization[]>('/organizations');
      setOrgs(data);
      setLoadError(null);
    } catch (err) {
      setLoadError((err as Error).message ?? 'Impossible de charger les organisations.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  async function createOrg(e: React.FormEvent) {
    e.preventDefault();
    setOrgError(null);
    try {
      const created = await api.post<Organization>('/organizations', {
        slug: orgForm.slug,
        name: orgForm.name,
        memberLabel: orgForm.memberLabel || undefined,
        primaryColor: orgForm.primaryColor || undefined,
      });
      setOrgForm({ ...emptyOrgForm });
      setShowForm(false);
      showToast('Organisation créée. Créez maintenant son premier administrateur.');
      setAdminTargetOrg(created);
      load();
    } catch (err) {
      setOrgError((err as Error).message ?? 'Erreur lors de la création.');
    }
  }

  async function createAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!adminTargetOrg) return;
    setAdminError(null);
    try {
      await api.post(`/organizations/${adminTargetOrg.id}/admins`, adminForm);
      showToast(`Administrateur créé pour "${adminTargetOrg.name}".`);
      setAdminTargetOrg(null);
      setAdminForm({ ...emptyAdminForm });
      load();
    } catch (err) {
      setAdminError((err as Error).message ?? 'Erreur lors de la création.');
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Plateforme eVote</p>
            <h1 className="text-lg font-bold text-slate-900">Organisations</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">{user?.name}</span>
            <button type="button" onClick={handleLogout} className="bo-btn bo-btn-ghost">
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {loadError && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError.includes('401') || loadError.includes('non authentifié') || loadError.includes('Unauthorized')
              ? 'Session expirée. Veuillez vous reconnecter.'
              : loadError}
          </div>
        )}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {orgs.length} organisation{orgs.length > 1 ? 's' : ''} sur la plateforme.
          </p>
          <button
            type="button"
            onClick={() => { setShowForm((s) => !s); setOrgError(null); }}
            className={showForm ? 'bo-btn bo-btn-close' : 'bo-btn bo-btn-primary'}
          >
            {showForm ? 'Fermer' : 'Nouvelle organisation'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={createOrg} className="mb-6 grid gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 sm:grid-cols-2">
            {orgError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 sm:col-span-2">
                {orgError}
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Slug (identifiant de connexion)</label>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                placeholder="ex : mon-association"
                value={orgForm.slug}
                onChange={(e) => setOrgForm({ ...orgForm, slug: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Nom</label>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                placeholder="ex : Association des Jeunes"
                value={orgForm.name}
                onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Libellé du numéro de membre (optionnel)</label>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                placeholder="ex : Numéro de membre"
                value={orgForm.memberLabel}
                onChange={(e) => setOrgForm({ ...orgForm, memberLabel: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Couleur principale (optionnel)</label>
              <input
                type="color"
                className="h-10 w-full rounded-xl border border-slate-200 px-1 py-1"
                value={orgForm.primaryColor || '#059669'}
                onChange={(e) => setOrgForm({ ...orgForm, primaryColor: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className="bo-btn bo-btn-primary">Créer l'organisation</button>
            </div>
          </form>
        )}

        {adminTargetOrg && (
          <form onSubmit={createAdmin} className="mb-6 grid gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-emerald-200 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <h2 className="text-sm font-bold text-slate-900">
                Premier administrateur de "{adminTargetOrg.name}"
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Un mot de passe temporaire sera généré et envoyé par email.
              </p>
            </div>
            {adminError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 sm:col-span-2">
                {adminError}
              </div>
            )}
            {[
              { key: 'ordreNumber', label: 'Numéro de membre' },
              { key: 'email', label: 'Email', type: 'email' },
              { key: 'firstName', label: 'Prénom' },
              { key: 'lastName', label: 'Nom' },
            ].map(({ key, label, type }) => (
              <div key={key}>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</label>
                <input
                  type={type ?? 'text'}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  value={(adminForm as Record<string, string>)[key]}
                  onChange={(e) => setAdminForm({ ...adminForm, [key]: e.target.value })}
                  required
                />
              </div>
            ))}
            <div className="flex items-center gap-3 sm:col-span-2">
              <button type="submit" className="bo-btn bo-btn-primary">Créer l'administrateur</button>
              <button type="button" onClick={() => setAdminTargetOrg(null)} className="bo-btn bo-btn-ghost">
                Plus tard
              </button>
            </div>
          </form>
        )}

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3.5">Organisation</th>
                <th className="px-5 py-3.5">Slug</th>
                <th className="px-5 py-3.5">Membres</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {orgs.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: o.primaryColor ?? '#059669' }}
                      />
                      <span className="font-semibold text-slate-900">{o.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">{o.slug}</td>
                  <td className="px-5 py-3.5 text-slate-500">{o._count.users}</td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => { setAdminTargetOrg(o); setAdminError(null); }}
                      className="text-xs font-medium text-emerald-600 hover:underline"
                    >
                      + Ajouter un admin
                    </button>
                  </td>
                </tr>
              ))}
              {orgs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-slate-400">
                    Aucune organisation pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
