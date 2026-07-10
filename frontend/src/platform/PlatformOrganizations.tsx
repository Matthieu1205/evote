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
  const [createdAdmin, setCreatedAdmin] = useState<{ ordreNumber: string; tempPassword: string; orgName: string } | null>(null);

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
      const result = await api.post<{ ordreNumber: string; tempPassword: string }>(`/organizations/${adminTargetOrg.id}/admins`, adminForm);
      setCreatedAdmin({ ordreNumber: result.ordreNumber, tempPassword: result.tempPassword, orgName: adminTargetOrg.name });
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
        <div className="fixed bottom-4 left-4 right-4 z-50 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white shadow-lg sm:left-auto sm:right-6 sm:w-auto">
          {toast}
        </div>
      )}

      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Plateforme eVote</p>
            <h1 className="text-base font-bold text-slate-900 sm:text-lg">Organisations</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden text-sm text-slate-500 sm:block">{user?.name}</span>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">

        {/* Erreur de chargement */}
        {loadError && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError.includes('401') || loadError.includes('non authentifié') || loadError.includes('Unauthorized')
              ? 'Session expirée. Veuillez vous reconnecter.'
              : loadError}
          </div>
        )}

        {/* Identifiants admin créés — à copier */}
        {createdAdmin && (
          <div className="mb-6 rounded-xl border border-emerald-300 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">
            <p className="font-semibold">Administrateur créé pour « {createdAdmin.orgName} » ✓</p>
            <p className="mt-2 text-xs">Conserve ces identifiants — ils ne seront plus affichés :</p>
            <div className="mt-2 overflow-x-auto rounded-lg bg-white px-4 py-3 font-mono text-sm">
              <p>Organisation&nbsp;: <b>{orgs.find(o => o.name === createdAdmin.orgName)?.slug}</b></p>
              <p>Numéro&nbsp;: <b>{createdAdmin.ordreNumber}</b></p>
              <p>Mot de passe&nbsp;: <b>{createdAdmin.tempPassword}</b></p>
            </div>
            <button type="button" onClick={() => setCreatedAdmin(null)} className="mt-3 text-xs underline text-emerald-700">
              Fermer
            </button>
          </div>
        )}

        {/* Barre d'actions */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            {orgs.length} organisation{orgs.length > 1 ? 's' : ''} sur la plateforme.
          </p>
          <button
            type="button"
            onClick={() => { setShowForm((s) => !s); setOrgError(null); }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              showForm
                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {showForm ? 'Annuler' : (
              <>
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Nouvelle organisation
              </>
            )}
          </button>
        </div>

        {/* Formulaire nouvelle organisation */}
        {showForm && (
          <form onSubmit={createOrg} className="mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-6">
            <h2 className="mb-4 text-sm font-bold text-slate-800">Nouvelle organisation</h2>
            {orgError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{orgError}</div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
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
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Libellé du numéro de membre <span className="font-normal text-slate-400">(optionnel)</span>
                </label>
                <input
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  placeholder="ex : Numéro de membre"
                  value={orgForm.memberLabel}
                  onChange={(e) => setOrgForm({ ...orgForm, memberLabel: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Couleur principale <span className="font-normal text-slate-400">(optionnel)</span>
                </label>
                <input
                  type="color"
                  className="h-10 w-full rounded-xl border border-slate-200 px-1 py-1"
                  value={orgForm.primaryColor || '#059669'}
                  onChange={(e) => setOrgForm({ ...orgForm, primaryColor: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-4">
              <button type="submit" className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                Créer l'organisation
              </button>
            </div>
          </form>
        )}

        {/* Formulaire premier administrateur */}
        {adminTargetOrg && (
          <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-emerald-200 sm:p-6">
            <div className="mb-4">
              <h2 className="text-sm font-bold text-slate-900">
                Premier administrateur de « {adminTargetOrg.name} »
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Un mot de passe temporaire sera généré et affiché une seule fois.
              </p>
            </div>
            {adminError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{adminError}</div>
            )}
            <form onSubmit={createAdmin} className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Numéro de membre</label>
                <input
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  value={adminForm.ordreNumber}
                  onChange={(e) => setAdminForm({ ...adminForm, ordreNumber: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Email</label>
                <input
                  type="email"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  value={adminForm.email}
                  onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Prénom</label>
                <input
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  value={adminForm.firstName}
                  onChange={(e) => setAdminForm({ ...adminForm, firstName: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Nom</label>
                <input
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  value={adminForm.lastName}
                  onChange={(e) => setAdminForm({ ...adminForm, lastName: e.target.value })}
                  required
                />
              </div>
              <div className="flex flex-wrap gap-3 sm:col-span-2">
                <button type="submit" className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                  Créer l'administrateur
                </button>
                <button
                  type="button"
                  onClick={() => setAdminTargetOrg(null)}
                  className="rounded-xl border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Plus tard
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Liste des organisations — cartes (pas de tableau) */}
        {orgs.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center text-slate-400 shadow-sm ring-1 ring-slate-100">
            Aucune organisation pour le moment.
          </div>
        ) : (
          <div className="space-y-3">
            {orgs.map((o) => (
              <div key={o.id} className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:flex-row sm:items-center sm:p-5">
                {/* Pastille couleur + nom */}
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span
                    className="h-9 w-9 shrink-0 rounded-xl"
                    style={{ backgroundColor: o.primaryColor ?? '#059669' }}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{o.name}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      <span className="font-mono">{o.slug}</span>
                      <span className="mx-1.5 text-slate-200">·</span>
                      {o._count.users} membre{o._count.users > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                {/* Bouton toujours visible, pleine largeur sur mobile */}
                <button
                  type="button"
                  onClick={() => {
                    setAdminTargetOrg(o);
                    setAdminError(null);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 sm:w-auto sm:py-2"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Ajouter un admin
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
