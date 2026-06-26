import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HeroSlider, type HeroSlide } from '../components/HeroSlider';
import { CandidateStrip } from '../components/CandidateStrip';
import { CandidatesCarousel } from '../components/CandidatesCarousel';
import { CountdownTimer } from '../components/CountdownTimer';
import { StickyNav } from '../components/StickyNav';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface HomeData {
  candidates: HeroSlide[];
  memberCount: number;
  election: { title: string; startAt: string; endAt: string; status: string } | null;
}

export default function LandingPage() {
  const [data, setData] = useState<HomeData>({ candidates: [], memberCount: 0, election: null });

  useEffect(() => {
    fetch(`${BASE}/public/home`)
      .then((r) => r.json())
      .then((d) => {
        const electionTitle: string | undefined = d.election?.title;
        setData({
          ...d,
          candidates: (d.candidates ?? []).map((c: any) => ({ ...c, electionTitle })),
        });
      })
      .catch(() => {});
  }, []);

  const { candidates, memberCount, election } = data;

  const STATS = [
    {
      value: memberCount > 0 ? `${memberCount.toLocaleString('fr-FR')}+` : '—',
      label: 'Pharmaciens membres',
      sub: "Inscrits à l'Ordre",
      icon: (
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      value: candidates.length > 0 ? String(candidates.length) : '—',
      label: 'Candidats en lice',
      sub: 'Candidatures validées',
      icon: (
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
      ),
    },
    {
      value: 'AES-256',
      label: 'Chiffrement',
      sub: 'Bulletins protégés',
      icon: (
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
    },
    {
      value: '100%',
      label: 'Confidentialité',
      sub: 'Vote anonyme garanti',
      icon: (
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* NAV + HERO */}
      <div className="relative">
        <StickyNav />
        <HeroSlider slides={candidates} />
      </div>

      {/* BANDE CANDIDATS — juste sous le hero */}
      <CandidateStrip candidates={candidates} />

      {/* STATS */}
      <section className="relative overflow-hidden py-16" style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)' }}>
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-px bg-white/10 lg:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-4 bg-transparent px-6 py-10 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-emerald-300">
                  {s.icon}
                </div>
                <div className="text-5xl font-black leading-none tracking-tight text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {s.value}
                </div>
                <div>
                  <p className="text-base font-bold text-white">{s.label}</p>
                  <p className="mt-0.5 text-xs font-medium text-emerald-300">{s.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CANDIDATS */}
      {candidates.length > 0 && <CandidatesCarousel candidates={candidates} />}

      {/* CHIFFRES D'IMPACT */}
      <section id="processus" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 pb-14 text-center sm:px-6">
          <span className="text-xs font-black uppercase tracking-[0.25em] text-brand-600">La plateforme en chiffres</span>
          <h2 className="mt-2 text-4xl font-extrabold text-ink-900">Ce que dit notre bilan</h2>
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-ink-100 bg-ink-100 shadow-sm lg:grid-cols-4">
            {[
              { value: '5 min', label: 'Temps moyen pour voter', desc: 'De la connexion à la confirmation du bulletin chiffré.' },
              { value: '100%', label: 'Bulletins chiffrés', desc: 'AES-256-GCM, illisibles même par les administrateurs.' },
              { value: '2×', label: 'Double authentification', desc: 'OTP à la connexion et à la confirmation du vote.' },
              { value: '0', label: 'Incident de sécurité', desc: 'Aucune fuite ni altération depuis le lancement.' },
            ].map((stat) => (
              <div key={stat.value} className="group flex flex-col items-center gap-3 bg-white px-6 py-10 text-center transition hover:bg-brand-50">
                <span className="font-black leading-none tracking-tighter text-brand-600 transition group-hover:text-brand-700" style={{ fontSize: 'clamp(2.8rem, 5vw, 4.5rem)' }}>
                  {stat.value}
                </span>
                <div>
                  <p className="text-base font-extrabold text-ink-900">{stat.label}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-500">{stat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-14 h-1 w-full" style={{ background: 'linear-gradient(to right, #059669, #064e3b)' }} />
      </section>

      {/* COMPTE À REBOURS */}
      {election ? (
        <CountdownTimer title={election.title} startAt={election.startAt} endAt={election.endAt} />
      ) : (
        <NoElectionCountdown />
      )}

      {/* FOOTER */}
      <footer className="border-t border-ink-100 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <Link to="/">
            <img src="/logo-evote.svg" alt="eVote" className="h-10 w-auto" />
          </Link>
          <p className="text-sm text-ink-400">
            © {new Date().getFullYear()} Plateforme de vote électronique — Ordre des Pharmaciens de Côte d'Ivoire
          </p>
          <Link to="/login" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
            Espace électeur →
          </Link>
        </div>
      </footer>
    </div>
  );
}

function NoElectionCountdown() {
  return (
    <section id="countdown" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div
          className="relative overflow-hidden rounded-3xl shadow-2xl"
          style={{ background: 'linear-gradient(160deg, #45CCAA 0%, #448170 55%, #466E63 100%)' }}
        >
          <div className="flex flex-col items-center gap-6 px-10 py-16 text-center sm:px-14">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-white">
              À VENIR
            </span>
            <h2 className="text-2xl font-extrabold text-white sm:text-3xl">
              Prochain scrutin
            </h2>
            <p className="max-w-md text-sm font-medium text-emerald-200">
              Aucun scrutin n'est planifié pour le moment. Le compte à rebours apparaîtra dès qu'une élection sera programmée.
            </p>
            <Link
              to="/login"
              className="mt-2 flex items-center gap-2 rounded-sm bg-white px-8 py-4 text-sm font-black uppercase tracking-widest text-brand-800 transition hover:bg-brand-50"
            >
              Accéder à la plateforme
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
