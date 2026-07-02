import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [organizationSlug, setOrganizationSlug] = useState('');
  const [ordreNumber, setOrdreNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/auth/forgot-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationSlug, ordreNumber }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as any).message ?? 'Erreur lors de la demande.');
      }
      setStep(2);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/auth/reset-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationSlug, ordreNumber, otp, newPassword }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((d as any).message ?? 'Code invalide ou expiré.');
      setStep(3);
    } catch (err) {
      setError((err as Error).message);
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
          <h1 className="text-3xl font-bold leading-tight">Récupération de compte</h1>
          <p className="mt-4 max-w-md text-white/80">
            Un code de vérification sera envoyé à l'adresse email associée à votre numéro de membre.
          </p>
        </div>
        <p className="relative z-10 text-sm text-white/50">
          Vote chiffré AES-256 · Mots de passe Argon2 · Journal d'audit
        </p>
      </div>

      {/* Panneau droit */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>

          {step === 3 ? (
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100">
                <svg viewBox="0 0 24 24" className="h-8 w-8 text-brand-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M5 12l5 5L20 7" />
                </svg>
              </div>
              <h2 className="mt-5 text-2xl font-bold text-ink-900">Mot de passe réinitialisé</h2>
              <p className="mt-2 text-sm text-ink-500">
                Votre nouveau mot de passe est actif. Vous pouvez maintenant vous connecter.
              </p>
              <Link
                to="/login"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
              >
                Se connecter
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-ink-900">
                {step === 1 ? 'Mot de passe oublié' : 'Nouveau mot de passe'}
              </h2>
              <p className="mt-1 text-sm text-ink-500">
                {step === 1
                  ? "Saisissez votre organisation et votre numéro d'inscription pour recevoir un code de réinitialisation."
                  : `Code envoyé à l'adresse email de ${ordreNumber}. Saisissez-le ci-dessous.`}
              </p>

              {error && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {step === 1 ? (
                <form onSubmit={handleRequest} className="mt-6 space-y-4">
                  <div>
                    <label htmlFor="fp-org" className="label">Organisation</label>
                    <input
                      id="fp-org"
                      className="input"
                      value={organizationSlug}
                      onChange={(e) => setOrganizationSlug(e.target.value)}
                      placeholder="ex : mon-organisation"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="fp-ordre" className="label">Numéro d'inscription</label>
                    <input
                      id="fp-ordre"
                      className="input"
                      value={ordreNumber}
                      onChange={(e) => setOrdreNumber(e.target.value)}
                      placeholder="ex : MEMBRE-001"
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                    {loading ? 'Envoi…' : 'Envoyer le code'}
                  </button>
                  <Link
                    to="/login"
                    className="block text-center text-sm text-ink-500 hover:text-ink-700"
                  >
                    Retour à la connexion
                  </Link>
                </form>
              ) : (
                <form onSubmit={handleReset} className="mt-6 space-y-4">
                  <div>
                    <label htmlFor="fp-otp" className="label">Code de vérification (6 chiffres)</label>
                    <input
                      id="fp-otp"
                      className="input tracking-[0.4em]"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="fp-new" className="label">Nouveau mot de passe</label>
                    <div className="relative">
                      <input
                        id="fp-new"
                        type={showNew ? 'text' : 'password'}
                        className="input pr-10"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min. 8 caractères"
                        minLength={8}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                        tabIndex={-1}
                        aria-label={showNew ? 'Masquer' : 'Afficher'}
                      >
                        {showNew ? (
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
                  <div>
                    <label htmlFor="fp-confirm" className="label">Confirmer le mot de passe</label>
                    <div className="relative">
                      <input
                        id="fp-confirm"
                        type={showConfirm ? 'text' : 'password'}
                        className="input pr-10"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Répétez le mot de passe"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                        tabIndex={-1}
                        aria-label={showConfirm ? 'Masquer' : 'Afficher'}
                      >
                        {showConfirm ? (
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
                  <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                    {loading ? 'Réinitialisation…' : 'Réinitialiser le mot de passe'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setStep(1); setOtp(''); setError(null); }}
                    className="block w-full text-center text-sm text-ink-500 hover:text-ink-700"
                  >
                    Retour
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
