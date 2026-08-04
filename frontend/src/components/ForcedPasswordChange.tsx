import { useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

/**
 * Écran présenté à la première connexion (mot de passe temporaire) : l'utilisateur
 * définit un nouveau mot de passe avant d'accéder à son espace. « Plus tard »
 * permet de continuer sans changer (le rappel réapparaîtra à la prochaine connexion).
 */
export function ForcedPasswordChange() {
  const { user, setUser } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next.length < 8) { setError('Le nouveau mot de passe doit contenir au moins 8 caractères.'); return; }
    if (next !== confirm) { setError('Les deux mots de passe ne correspondent pas.'); return; }
    if (next === current) { setError('Le nouveau mot de passe doit être différent du temporaire.'); return; }
    setLoading(true);
    try {
      await api.post('/auth/change-password', { currentPassword: current, newPassword: next });
      if (user) setUser({ ...user, mustChangePassword: false });
    } catch (err) {
      setError((err as Error).message ?? 'Erreur lors du changement de mot de passe.');
    } finally {
      setLoading(false);
    }
  }

  function skip() {
    if (user) setUser({ ...user, mustChangePassword: false });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg ring-1 ring-ink-100">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-100">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-brand-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-ink-900">Sécurisez votre compte</h1>
          <p className="mt-1 text-sm text-ink-500">
            Votre mot de passe est temporaire. Choisissez-en un nouveau avant d'accéder à votre espace.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-600">Mot de passe temporaire</label>
            <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required
              className="w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-600">Nouveau mot de passe</label>
            <input type="password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={8}
              className="w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-600">Confirmer le nouveau mot de passe</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required
              className="w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100" />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60">
            {loading ? 'Enregistrement…' : 'Définir mon mot de passe'}
          </button>
          <button type="button" onClick={skip}
            className="w-full text-center text-xs font-medium text-ink-400 hover:text-ink-600">
            Plus tard
          </button>
        </form>
      </div>
    </div>
  );
}
