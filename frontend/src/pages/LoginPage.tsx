import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "../components/Logo";
import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const justRegistered = new URLSearchParams(window.location.search).get('registered') === '1';
  const registeredOrg = new URLSearchParams(window.location.search).get('org') ?? '';

  const [step, setStep] = useState<1 | 2>(1);
  const [organizationSlug, setOrganizationSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const BASE = import.meta.env.PROD
    ? "/api"
    : import.meta.env.VITE_API_URL || "http://localhost:3001/api";

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/auth/request-otp`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationSlug, email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          (data as { error?: string }).error ??
            "Une erreur est survenue. Réessayez.",
        );
        return;
      }
      const d = data as { devCode?: string; bypass?: boolean };
      // If backend is in bypass mode, skip OTP step and login directly
      if ((d as any).message === "Mode bypass — aucun OTP requis.") {
        const loginRes = await fetch(`${BASE}/auth/login`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ organizationSlug, email, password }),
        });
        const loginData = await loginRes.json().catch(() => ({}));
        if (!loginRes.ok) {
          setError(
            (loginData as { error?: string }).error ?? "Erreur de connexion.",
          );
          return;
        }
        const userData = loginData as any;
        login(userData);
        navigate(userData.role === "SUPER_ADMIN" ? "/platform" : "/dashboard");
        return;
      }
      setDevCode(d.devCode ?? null);
      setStep(2);
    } catch {
      setError("Une erreur réseau est survenue. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationSlug, email, password, otp }),

      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          (data as { error?: string }).error ??
            "Identifiants ou code OTP invalides.",
        );
        return;
      }
      const userData = data as any;
      login(userData);
      navigate(userData.role === "SUPER_ADMIN" ? "/platform" : "/dashboard");
    } catch {
      setError("Une erreur réseau est survenue. Réessayez.");
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
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(160deg, rgba(10,20,30,0.72) 0%, rgba(6,78,59,0.55) 100%)",
          }}
        />
        <Logo className="relative z-10 [&_img]:brightness-0 [&_img]:invert" />
        <div className="relative z-10">
          <h1 className="text-3xl font-bold leading-tight">
            Votre voix compte, en toute confidentialité.
          </h1>
          <p className="mt-4 max-w-md text-white/80">
            Connexion sécurisée à votre espace membre. Authentification forte
            par mot de passe et code à usage unique.
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
          <h2 className="text-2xl font-bold text-ink-900">Connexion</h2>
          <p className="mt-1 text-sm text-ink-500">
            {step === 1
              ? "Saisissez vos identifiants pour accéder à votre espace."
              : "Saisissez le code à usage unique qui vous a été envoyé."}
          </p>

          {justRegistered && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <p className="font-semibold">Organisation créée avec succès !</p>
              <p className="mt-0.5">
                Connectez-vous avec l'organisation{" "}
                <b className="font-mono">{registeredOrg}</b> et votre email.
              </p>
            </div>
          )}
          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {devCode && step === 2 && (
            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              Mode démonstration — votre code OTP : <b>{devCode}</b>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={requestOtp} className="mt-6">
              <div className="field">
                <label className="label">Organisation</label>
                <input
                  className="input"
                  value={organizationSlug}
                  onChange={(e) => setOrganizationSlug(e.target.value)}
                  placeholder="ex : mon-organisation"
                  required
                />
              </div>
              <div className="field">
                <label className="label">Adresse email</label>
                <input
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ex : prenom.nom@exemple.fr"
                  required
                />
              </div>
              <div className="field">
                <label className="label" htmlFor="login-password">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    className="input pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Votre mot de passe"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                    tabIndex={-1}
                    aria-label={
                      showPassword
                        ? "Masquer le mot de passe"
                        : "Afficher le mot de passe"
                    }
                  >
                    {showPassword ? (
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="flex justify-end">
                <a
                  href="/forgot-password"
                  className="text-xs text-brand-600 hover:underline"
                >
                  Mot de passe oublié ?
                </a>
              </div>
              <button
                type="submit"
                className="btn-primary w-full"
                disabled={loading}
              >
                {loading ? "Vérification…" : "Se connecter"}
              </button>
              <p className="mt-4 text-center text-sm text-ink-500">
                Pas encore d'organisation ?{" "}
                <Link to="/register" className="font-medium text-brand-600 hover:underline">
                  Créer un espace gratuitement
                </Link>
              </p>
            </form>
          ) : (
            <form onSubmit={submitLogin} className="mt-6">
              <div className="field">
                <label className="label">
                  Code à usage unique (6 chiffres)
                </label>
                <input
                  className="input tracking-[0.4em]"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  required
                />
              </div>
              <button
                type="submit"
                className="btn-primary w-full"
                disabled={loading}
              >
                {loading ? "Connexion…" : "Se connecter"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setOtp("");
                  setError(null);
                }}
                className="btn-ghost mt-3 w-full"
              >
                Retour
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
