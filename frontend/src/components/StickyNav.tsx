import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const NAV_LINKS = [
  { label: 'Accueil',   href: '#' },
  { label: 'Candidats', href: '#candidats' },
  { label: 'Chiffres',  href: '#processus' },
  { label: 'Scrutin',   href: '#countdown' },
];

export function StickyNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const check = () => setScrolled(window.scrollY > 60);
    check();
    window.addEventListener('scroll', check, { passive: true });
    return () => window.removeEventListener('scroll', check);
  }, []);

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 shadow-sm backdrop-blur-md' : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <Link to="/">
          <img
            src="/logo-evote.svg"
            alt="eVote"
            className={`h-10 w-auto transition-all duration-300 ${
              scrolled
                ? '[filter:brightness(0)_saturate(100%)_invert(39%)_sepia(88%)_saturate(500%)_hue-rotate(124deg)]'
                : ''
            }`}
          />
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className={`text-sm font-semibold transition-colors duration-300 hover:opacity-100 ${
                scrolled ? 'text-ink-700 hover:text-brand-600' : 'text-white/80 hover:text-white'
              }`}
            >
              {l.label}
            </a>
          ))}
        </nav>

        <Link
          to="/login"
          className={`rounded-sm px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow transition-all duration-300 ${
            scrolled ? 'bg-brand-600 hover:bg-brand-500' : 'bg-brand-600/80 hover:bg-brand-600'
          }`}
        >
          Espace électeur
        </Link>
      </div>
    </header>
  );
}
