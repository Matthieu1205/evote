import { Link } from "react-router-dom";

const FALLBACK_BG = "/img-acceuil.png";

const QUOTES = [
  "Une plateforme de vote électronique sécurisée, conçue pour les organisations professionnelles.",
  "Chiffrement de bout en bout, double authentification, transparence totale : votez en toute confiance.",
  "Donnez à votre organisation les moyens d'organiser des élections fiables et accessibles à tous ses membres.",
];

export function HeroSlider() {
  const quote = QUOTES[0];

  return (
    <section
      className="relative flex min-h-screen flex-col overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #021a11 0%, #064e3b 100%)' }}
    >
      {/* Motif points */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '28px 28px' }}
      />

      {/* Photo droite — découpe diagonale */}
      <div
        className="absolute right-0 top-0 bottom-0 bg-cover bg-no-repeat"
        style={{
          width: '62%',
          backgroundImage: `url('${FALLBACK_BG}')`,
          backgroundPosition: 'center top',
          clipPath: 'polygon(14% 0%, 100% 0%, 100% 100%, 0% 100%)',
        }}
      />
      {/* Dégradé bas pour lisibilité */}
      <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(2,26,17,0.65) 0%, transparent 40%)' }} />

      {/* Contenu — texte sur la moitié gauche */}
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-center px-8 pb-20 pt-28 sm:px-12 lg:px-16">
        <div className="flex flex-col" style={{ width: "46%", minWidth: 0 }}>
          <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-300">
              Vote électronique sécurisé
            </span>
          </div>

          <p
            className="mt-2 leading-snug text-white/90"
            style={{
              fontFamily: "'Lobster Two', cursive",
              fontSize: "clamp(1.3rem, 1.8vw, 1.8rem)",
              wordBreak: "break-word",
              overflowWrap: "break-word",
            }}
          >
            {quote}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/login"
              className="rounded-sm bg-emerald-500 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-emerald-400"
            >
              Accéder à la plateforme →
            </Link>
            <a
              href="#processus"
              className="rounded-sm border border-white/25 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white/70 transition hover:border-white/50 hover:text-white"
            >
              En savoir plus
            </a>
          </div>
        </div>
      </div>

      {/* Vague de transition */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <svg
          viewBox="0 0 1440 70"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          style={{ display: "block", height: 70 }}
        >
          <path d="M0,35 C480,70 960,0 1440,35 L1440,70 L0,70 Z" fill="white" />
        </svg>
      </div>
    </section>
  );
}
