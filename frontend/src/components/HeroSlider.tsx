import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

export interface HeroSlide {
  id: string;
  name: string;
  position: string;
  electionTitle?: string;
  photoUrl?: string | null;
  biography?: string | null;
  program?: string | null;
}

const FALLBACK_BG =
  "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1920&q=80";

const PHARMA_QUOTES = [
  "La pharmacie est au cœur de la santé publique. Chaque médicament dispensé est un acte de confiance envers le patient.",
  "Garantir l'accès aux soins de qualité pour tous, renforcer la profession pharmaceutique et défendre l'éthique médicale : telle est notre mission.",
  "Un pharmacien engagé, c'est une communauté en meilleure santé. Ensemble, faisons progresser notre Ordre et notre profession.",
  "La rigueur scientifique, le respect du patient et la solidarité confraternelle sont les piliers d'une pharmacie d'excellence.",
  "Œuvrer pour une pharmacie moderne, accessible et éthique au service de chaque citoyen de notre pays.",
];

function getQuote(slide: HeroSlide, index: number): string {
  const raw = slide.biography || slide.program || "";
  if (raw) return raw.length > 200 ? raw.slice(0, 197) + "…" : raw;
  return PHARMA_QUOTES[index % PHARMA_QUOTES.length];
}

export function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const total = slides.length;
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(true);

  const goTo = useCallback(
    (idx: number) => {
      setVisible(false);
      setTimeout(() => {
        setCurrent(((idx % total) + total) % total);
        setVisible(true);
      }, 450);
    },
    [total],
  );

  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

  useEffect(() => {
    if (total <= 1) return;
    const t = setInterval(next, 6000);
    return () => clearInterval(t);
  }, [next, total]);

  const slide = total > 0 ? slides[current] : null;
  const bgUrl = slide?.photoUrl ?? FALLBACK_BG;

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
          backgroundImage: `url('${bgUrl}')`,
          backgroundPosition: 'center top',
          clipPath: 'polygon(14% 0%, 100% 0%, 100% 100%, 0% 100%)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.5s ease',
        }}
      />
      {/* Dégradé bas pour lisibilité */}
      <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(2,26,17,0.65) 0%, transparent 40%)' }} />

      {/* Contenu — texte sur la moitié gauche */}
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-center px-8 pb-20 pt-28 sm:px-12 lg:px-16">
        <div
          className="flex flex-col"
          style={{
            width: '46%',
            minWidth: 0,
            overflow: 'hidden',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(16px)',
            transition: 'opacity 0.45s ease, transform 0.45s ease',
          }}
        >
          {/* Badge élection */}
          {slide?.electionTitle && (
            <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-300">
                Élection · {slide.electionTitle}
              </span>
            </div>
          )}

          <p
            className="mt-2 leading-snug text-white/90"
            style={{
              fontFamily: "'Lobster Two', cursive",
              fontSize: 'clamp(1.3rem, 1.8vw, 1.8rem)',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 5,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {slide ? getQuote(slide, current) : PHARMA_QUOTES[0]}
          </p>

          {slide && (
            <div className="mt-7 flex items-center gap-3">
              <div className="h-px w-8 rounded-full bg-emerald-400/60" />
              <div>
                <p className="text-lg font-extrabold text-white">{slide.name}</p>
                <p className="text-sm font-semibold text-emerald-400">{slide.position}</p>
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/login"
              className="rounded-sm bg-emerald-500 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-emerald-400"
            >
              Accéder à la plateforme →
            </Link>
            <a
              href="#candidats"
              className="rounded-sm border border-white/25 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white/70 transition hover:border-white/50 hover:text-white"
            >
              Voir les candidats
            </a>
          </div>

          {total > 1 && (
            <div className="mt-10 flex gap-2">
              {slides.map((_, i) => (
                <button key={i} type="button" onClick={() => goTo(i)} aria-label={`Slide ${i + 1}`}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{ width: i === current ? 28 : 8, background: i === current ? '#10b981' : 'rgba(255,255,255,0.35)' }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Flèches navigation */}
      {total > 1 && (
        <>
          <button type="button" onClick={prev} aria-label="Précédent"
            className="absolute left-3 top-1/2 z-20 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full transition hover:brightness-110"
            style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(4px)' }}>
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button type="button" onClick={next} aria-label="Suivant"
            className="absolute right-3 top-1/2 z-20 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full transition hover:brightness-110"
            style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(4px)' }}>
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </>
      )}

      {/* Vague de transition */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <svg viewBox="0 0 1440 70" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ display: 'block', height: 70 }}>
          <path d="M0,35 C480,70 960,0 1440,35 L1440,70 L0,70 Z" fill="white" />
        </svg>
      </div>
    </section>
  );
}
