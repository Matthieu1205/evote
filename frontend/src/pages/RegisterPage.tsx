import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';

const BASE = import.meta.env.PROD
  ? '/api'
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    slug: '',
    memberLabel: '',
    primaryColor: '#059669',
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPassword: '',
    adminPasswordConfirm: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function slugify(value: string) {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function handleNameChange(value: string) {
    setForm((f) => ({
      ...f,
      name: value,
      slug: f.slug || slugify(value),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.adminPassword !== form.adminPasswordConfirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (form.adminPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE}/organizations/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: form.slug,
          name: form.name,
          memberLabel: form.memberLabel || undefined,
          primaryColor: form.primaryColor || undefined,
          adminFirstName: form.adminFirstName,
          adminLastName: form.adminLastName,
          adminEmail: form.adminEmail,
          adminPassword: form.adminPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as any).message ?? 'Une erreur est survenue.');
        return;
      }
      navigate('/login?registered=1&org=' + encodeURIComponent((data as any).organizationSlug));
    } catch {
      setError('Erreur réseau. Vérifiez votre connexion et réessayez.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Panneau gauche */}
      <div
        className="relative hidden flex-col justify-between p-12 text-white lg:flex"
        style={{
          backgroundImage: "url('/fond-conexion.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'linear-gradient(160deg, rgba(10,20,30,0.72) 0%, rgba(6,78,59,0.55) 100%)' }}
        />
        <Logo className="relative z-10 [&_img]:brightness-0 [&_img]:invert" />
        <div className="relative z-10">
          <h1 className="text-3xl font-bold leading-tight">
            Créez votre espace de vote en quelques minutes.
          </h1>
          <p className="mt-4 max-w-md text-white/80">
            Invitez vos membres, configurez vos scrutins et organisez des
            élections sécurisées sans passer par un intermédiaire.
          </p>
        </div>
        <p className="relative z-10 text-sm text-white/50">
          Vote chiffré AES-256 · Mots de passe Argon2 · Journal d'audit
        </p>
      </div>

      {/* Panneau droit */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="mb-6 lg:hidden">
            <Logo />
          </div>

          <h2 className="text-2xl font-bold text-ink-900">Créer une organisation</h2>
          <p className="mt-1 text-sm text-ink-500">
            Votre compte administrateur sera créé en même temps.
          </p>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {/* Section organisation */}
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-400">
                Votre organisation
              </p>
              <div className="space-y-3">
                <div className="field">
                  <label className="label">Nom de l'organisation</label>
                  <input
                    className="input"
                    placeholder="ex : Association Jeunes Leaders"
                    value={form.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label className="label">
                    Identifiant unique (slug)
                    <span className="ml-1 font-normal text-ink-400">— visible dans l'URL de connexion</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 select-none text-sm text-ink-400">
                      evote /
                    </span>
                    <input
                      className="input pl-14"
                      placeholder="jeunes-leaders"
                      value={form.slug}
                      onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                      pattern="[a-z0-9\-]+"
                      title="Lettres minuscules, chiffres et tirets uniquement"
                      required
                    />
                  </div>
                </div>
                <div className="field">
                  <label className="label">
                    Libellé du numéro de membre
                    <span className="ml-1 font-normal text-ink-400">(optionnel)</span>
                  </label>
                  <input
                    className="input"
                    placeholder="ex : Matricule, Numéro d'adhérent…"
                    value={form.memberLabel}
                    onChange={(e) => setForm({ ...form, memberLabel: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label className="label">
                    Couleur principale
                    <span className="ml-1 font-normal text-ink-400">(optionnel)</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      className="h-10 w-16 cursor-pointer rounded-xl border border-ink-200 px-1 py-1"
                      value={form.primaryColor}
                      onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                    />
                    <span className="font-mono text-sm text-ink-500">{form.primaryColor}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-ink-100" />

            {/* Section compte admin */}
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-400">
                Votre compte administrateur
              </p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="field">
                    <label className="label">Prénom</label>
                    <input
                      className="input"
                      placeholder="Jean"
                      value={form.adminFirstName}
                      onChange={(e) => setForm({ ...form, adminFirstName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="field">
                    <label className="label">Nom</label>
                    <input
                      className="input"
                      placeholder="Dupont"
                      value={form.adminLastName}
                      onChange={(e) => setForm({ ...form, adminLastName: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="field">
                  <label className="label">Adresse email</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="jean.dupont@exemple.fr"
                    value={form.adminEmail}
                    onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                    required
                  />
                </div>
                <div className="field">
                  <label className="label">Mot de passe</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="input pr-10"
                      placeholder="Min. 8 caractères"
                      minLength={8}
                      value={form.adminPassword}
                      onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                      tabIndex={-1}
                    >
                      <EyeIcon open={showPassword} />
                    </button>
                  </div>
                </div>
                <div className="field">
                  <label className="label">Confirmer le mot de passe</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input"
                    placeholder="Répétez le mot de passe"
                    value={form.adminPasswordConfirm}
                    onChange={(e) => setForm({ ...form, adminPasswordConfirm: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={loading}
            >
              {loading ? 'Création en cours…' : 'Créer mon organisation'}
            </button>

            <p className="text-center text-sm text-ink-500">
              Vous avez déjà un compte ?{' '}
              <Link to="/login" className="font-medium text-brand-600 hover:underline">
                Se connecter
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
