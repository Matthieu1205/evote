import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "../components/Logo";

const BASE = import.meta.env.PROD
  ? "/api"
  : import.meta.env.VITE_API_URL || "http://localhost:3001/api";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
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
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);

  // Étape 1 — compte personnel
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Étape 2 — organisation
  const [orgName, setOrgName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [memberLabel, setMemberLabel] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#059669");
  const [logoUrl, setLogoUrl] = useState("");        // base64 → envoyé à l'API
  const [logoPreview, setLogoPreview] = useState(""); // object URL → aperçu
  const [logoError, setLogoError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function slugify(value: string) {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function handleOrgNameChange(value: string) {
    setOrgName(value);
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError(null);
    if (!file.type.startsWith("image/")) {
      setLogoError("Le fichier doit être une image (PNG, JPG, SVG…).");
      return;
    }
    if (file.size > 1_000_000) {
      setLogoError("Le logo ne doit pas dépasser 1 Mo.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setLogoUrl(result);
      setLogoPreview(result);
    };
    reader.readAsDataURL(file);
  }

  function removeLogo() {
    setLogoPreview("");
    setLogoUrl("");
  }

  function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== passwordConfirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleStep2(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/organizations/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          name: orgName,
          memberLabel: memberLabel || undefined,
          primaryColor: primaryColor || undefined,
          logoUrl: logoUrl || undefined,
          adminFirstName: firstName,
          adminLastName: lastName,
          adminEmail: email,
          adminPassword: password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as any).message ?? "Une erreur est survenue.");
        return;
      }
      navigate(
        "/login?registered=1&org=" +
          encodeURIComponent((data as any).organizationSlug),
      );
    } catch {
      setError("Erreur réseau. Vérifiez votre connexion et réessayez.");
    } finally {
      setLoading(false);
    }
  }

  /* ─── Indicateur de progression ─── */
  const StepBar = () => (
    <div className="mb-8 flex items-center gap-0">
      {/* Étape 1 */}
      <div className="flex items-center gap-2">
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${step >= 1 ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-400"}`}
        >
          {step > 1 ? (
            <svg
              viewBox="0 0 16 16"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <polyline points="3 8 6.5 11.5 13 5" />
            </svg>
          ) : (
            "1"
          )}
        </div>
        <span
          className={`text-xs font-semibold ${step === 1 ? "text-ink-900" : "text-ink-400"}`}
        >
          Votre compte
        </span>
      </div>

      {/* Trait */}
      <div className="mx-3 h-px flex-1 bg-ink-200">
        <div
          className={`h-full bg-brand-600 transition-all duration-500 ${step > 1 ? "w-full" : "w-0"}`}
        />
      </div>

      {/* Étape 2 */}
      <div className="flex items-center gap-2">
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${step >= 2 ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-400"}`}
        >
          2
        </div>
        <span
          className={`text-xs font-semibold ${step === 2 ? "text-ink-900" : "text-ink-400"}`}
        >
          Votre organisation
        </span>
      </div>
    </div>
  );

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Panneau gauche */}
      <div
        className="relative hidden flex-col justify-between p-12 text-white lg:flex"
        style={{
          backgroundImage: "url('/fond-conexion.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
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
          {step === 1 ? (
            <>
              <h1 className="text-3xl font-bold leading-tight">
                Bienvenue sur eVote.
              </h1>
              <p className="mt-4 max-w-md text-white/80">
                Créez d'abord votre compte personnel. Vous configurerez ensuite
                votre organisation pour organiser vos scrutins.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold leading-tight">
                Configurez votre espace.
              </h1>
              <p className="mt-4 max-w-md text-white/80">
                Donnez un nom, un identifiant et une identité visuelle à votre
                organisation. Vous pourrez tout modifier plus tard.
              </p>
            </>
          )}
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

          <StepBar />

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* ══════════════════════════════
               ÉTAPE 1 — Compte personnel
          ══════════════════════════════ */}
          {step === 1 && (
            <>
              <h2 className="text-2xl font-bold text-ink-900">
                Créez votre compte
              </h2>
              <p className="mt-1 text-sm text-ink-500">
                Vous configurerez votre organisation à l'étape suivante.
              </p>

              <form onSubmit={handleStep1} className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="field">
                    <label className="label">Prénom</label>
                    <input
                      className="input"
                      placeholder="Jean"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="field">
                    <label className="label">Nom</label>
                    <input
                      className="input"
                      placeholder="Dupont"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="field">
                  <label className="label" htmlFor="reg-password">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <input
                      id="reg-password"
                      type={showPassword ? "text" : "password"}
                      className="input pr-10"
                      placeholder="Min. 8 caractères"
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                      tabIndex={-1}
                      aria-label={showPassword ? "Masquer" : "Afficher"}
                    >
                      <EyeIcon open={showPassword} />
                    </button>
                  </div>
                </div>

                <div className="field">
                  <label className="label">Confirmer le mot de passe</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="input pr-10"
                      placeholder="Répétez le mot de passe"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                      tabIndex={-1}
                      aria-label={showPassword ? "Masquer" : "Afficher"}
                    >
                      <EyeIcon open={showPassword} />
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn-primary w-full mt-2">
                  Continuer
                  <svg
                    viewBox="0 0 24 24"
                    className="ml-2 inline h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>

                <p className="text-center text-sm text-ink-500">
                  Déjà un compte ?{" "}
                  <Link
                    to="/login"
                    className="font-medium text-brand-600 hover:underline"
                  >
                    Se connecter
                  </Link>
                </p>
              </form>
            </>
          )}

          {/* ══════════════════════════════
               ÉTAPE 2 — Organisation
          ══════════════════════════════ */}
          {step === 2 && (
            <>
              <h2 className="text-2xl font-bold text-ink-900">
                Votre organisation
              </h2>
              <p className="mt-1 text-sm text-ink-500">
                Compte créé pour{" "}
                <span className="font-medium text-ink-700">{email}</span>.
                Configurez maintenant votre espace.
              </p>

              <form onSubmit={handleStep2} className="mt-6 space-y-4">
                {/* Logo */}
                <div className="field">
                  <label className="label">
                    Logo
                    <span className="ml-1 font-normal text-ink-400">
                      (optionnel · PNG, JPG, SVG · max 1 Mo)
                    </span>
                  </label>

                  {/* Aperçu du logo */}
                  {logoPreview && (
                    <div className="mb-3">
                      <img
                        src={logoPreview}
                        alt="Logo"
                        style={{ maxHeight: 80, maxWidth: 160, borderRadius: 8, border: '1px solid #e2e8f0', display: 'block' }}
                      />
                    </div>
                  )}

                  {/* Bouton de sélection */}
                  <div className="flex items-center gap-3">
                    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-ink-300 px-4 py-2.5 text-sm text-ink-500 transition hover:border-brand-400 hover:text-brand-600">
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      {logoPreview ? "Changer le logo" : "Choisir un logo"}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleLogoChange}
                      />
                    </label>
                    {logoPreview && (
                      <button type="button" onClick={removeLogo} className="text-xs text-red-500 hover:text-red-700">
                        Supprimer
                      </button>
                    )}
                  </div>
                  {logoError && <p className="mt-1 text-xs text-red-600">{logoError}</p>}
                </div>

                {/* Nom */}
                <div className="field">
                  <label className="label">Nom de l'organisation</label>
                  <input
                    className="input"
                    placeholder="ex : Association Jeunes Leaders"
                    value={orgName}
                    onChange={(e) => handleOrgNameChange(e.target.value)}
                    required
                  />
                </div>

                {/* Slug */}
                <div className="field">
                  <label className="label">
                    Sigle de votre organisation(En majuscules, sans espace ni
                    accent)
                    <span className="ml-1 font-normal text-ink-400">
                      — visible dans l'URL de connexion
                    </span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 select-none text-sm text-ink-400">
                      evote /
                    </span>
                    <input
                      className="input pl-14"
                      placeholder="ex : mutuelle-cocody"
                      value={slug}
                      onChange={(e) => {
                        setSlugManual(true);
                        setSlug(slugify(e.target.value));
                      }}
                      pattern="[a-z0-9\-]+"
                      title="Lettres minuscules, chiffres et tirets uniquement"
                      required
                    />
                  </div>
                </div>

                {/* Couleur */}
                <div className="field">
                  <label className="label">
                    Couleur principale
                    <span className="ml-1 font-normal text-ink-400">
                      (optionnel)
                    </span>
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      className="h-10 w-16 cursor-pointer rounded-xl border border-ink-200 px-1 py-1"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                    />
                    <span className="font-mono text-sm text-ink-500">
                      {primaryColor}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setError(null);
                    }}
                    className="btn-ghost flex-1"
                  >
                    ← Retour
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex-1"
                    disabled={loading}
                  >
                    {loading ? "Création en cours…" : "Créer mon espace"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
