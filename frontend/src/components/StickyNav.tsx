import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

const NAV_LINKS = [
  { label: "Accueil", href: "/", external: false },
  { label: "Fonctionnalités", href: "#fonctionnalites", external: false },
  { label: "Sécurité", href: "#processus", external: false },
];

export function StickyNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const check = () => {
      const y = window.scrollY;
      setScrolled(y > 60);

      const doc = document.documentElement;
      const maxScroll = Math.max(1, doc.scrollHeight - doc.clientHeight);
      const progress = Math.min(1, Math.max(0, y / maxScroll));
      setScrollProgress(progress);
    };

    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, []);

  // Ferme le menu au scroll
  useEffect(() => {
    if (menuOpen) setMenuOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrolled]);

  const location = useLocation();
  const isHome = location.pathname === "/";

  const linkClass = (active: boolean) =>
    `group relative text-sm font-semibold transition-colors duration-300 hover:opacity-100 ${
      active
        ? "text-brand-600 hover:text-brand-700"
        : scrolled
          ? "text-brand-600 hover:text-brand-600"
          : "text-white/80 hover:text-brand-600"
    }`;

  return (
    <>
      <header
        className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-white/95 shadow-sm backdrop-blur-md" : "bg-transparent"
        }`}
      >
        {/* Progress bar de scroll (nav) */}
        <div
          className="h-0.5 w-full origin-left bg-brand-600 transition-transform duration-150"
          style={{ transform: `scaleX(${scrollProgress})` }}
        />

        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          {/* Logo */}
          <Link to="/" onClick={() => setMenuOpen(false)}>
            <img
              src="/logo-evote.svg"
              alt="eVote"
              className={`h-10 w-auto transition-all duration-300 ${
                scrolled
                  ? "[filter:brightness(0)_saturate(100%)_invert(39%)_sepia(88%)_saturate(500%)_hue-rotate(124deg)]"
                  : ""
              }`}
            />
          </Link>

          {/* Nav desktop */}
          <nav className="hidden items-center gap-7 md:flex">
            {NAV_LINKS.map((l) => {
              const isActive = l.label === "Accueil" && isHome;

              return (
                <a key={l.label} href={l.href} className={linkClass(isActive)}>
                  {l.label}
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute -bottom-2 left-0 h-0.5 w-full origin-left scale-x-0 bg-brand-600 transition-transform duration-300 ease-out group-hover:scale-x-100 ${
                      isActive ? "opacity-100" : "opacity-80"
                    }`}
                  />
                </a>
              );
            })}
            <Link
              to="/register"
              className="group relative text-sm font-semibold text-brand-600 hover:text-brand-600"
            >
              Créer un espace
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-2 left-0 h-0.5 w-full origin-left scale-x-0 bg-brand-600 transition-transform duration-300 ease-out group-hover:scale-x-100 opacity-0 group-hover:opacity-100"
              />
            </Link>
          </nav>

          {/* Boutons desktop */}
          <div className="hidden items-center gap-3 md:flex">
            <Link
              to="/login"
              className={`text-sm font-semibold transition-colors duration-300 ${
                scrolled
                  ? "text-white/80 hover:text-brand-600"
                  : "text-white/80 hover:text-brand-600"
              }`}
            >
              Connexion
            </Link>
            <Link
              to="/register"
              className={`rounded-sm px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow transition-all duration-300 ${
                scrolled
                  ? "bg-brand-600 hover:bg-brand-500"
                  : "bg-brand-600/80 hover:bg-brand-600"
              }`}
            >
              Commencer gratuitement
            </Link>
          </div>

          {/* Burger mobile */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className={`flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-lg transition md:hidden ${
              scrolled ? "text-ink-700" : "text-white"
            }`}
            aria-label="Menu"
          >
            <span
              className={`block h-0.5 w-6 rounded-full bg-current transition-transform duration-300 ${
                menuOpen ? "translate-y-2 rotate-45" : ""
              }`}
            />
            <span
              className={`block h-0.5 w-6 rounded-full bg-current transition-opacity duration-300 ${
                menuOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`block h-0.5 w-6 rounded-full bg-current transition-transform duration-300 ${
                menuOpen ? "-translate-y-2 -rotate-45" : ""
              }`}
            />
          </button>
        </div>
      </header>

      {/* Menu mobile drawer */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 md:hidden ${
          menuOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={() => setMenuOpen(false)}
        />

        {/* Panel */}
        <div
          className={`absolute left-0 right-0 top-[72px] mx-4 rounded-2xl bg-white shadow-2xl transition-all duration-300 ${
            menuOpen ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"
          }`}
        >
          <nav className="flex flex-col divide-y divide-ink-100 px-2 py-3">
            {NAV_LINKS.map((l, idx) => (
              <a
                key={l.label}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold text-ink-700 transition hover:bg-ink-50 hover:text-brand-600"
                style={{ transitionDelay: menuOpen ? `${idx * 60}ms` : "0ms" }}
              >
                {l.label}
              </a>
            ))}

            <Link
              to="/register"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold text-brand-600 transition hover:bg-brand-50"
            >
              Créer un espace
            </Link>
          </nav>
          <div className="border-t border-ink-100 p-3">
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="mb-2 flex w-full items-center justify-center rounded-xl border border-ink-200 py-3 text-sm font-semibold text-ink-700 transition hover:border-brand-400 hover:text-brand-600"
            >
              Connexion
            </Link>
            <Link
              to="/register"
              onClick={() => setMenuOpen(false)}
              className="flex w-full items-center justify-center rounded-xl bg-brand-600 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-brand-500"
            >
              Commencer gratuitement
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
