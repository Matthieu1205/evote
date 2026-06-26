import { useState } from 'react';
import { Link } from 'react-router-dom';

export interface CarouselCandidate {
  id: string;
  name: string;
  position: string;
  photoUrl?: string | null;
}

const PER_PAGE = 4;

export function CandidatesCarousel({ candidates }: { candidates: CarouselCandidate[] }) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(candidates.length / PER_PAGE);
  const visible = candidates.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const from = page * PER_PAGE + 1;
  const to = Math.min((page + 1) * PER_PAGE, candidates.length);

  return (
    <section id="candidats" className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600">
              Candidatures retenues
            </span>
            <h2 className="mt-1 text-3xl font-extrabold text-ink-900">Nos Candidats</h2>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-ink-400">{from}–{to} / {candidates.length}</span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              aria-label="Page précédente"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-ink-200 text-ink-600 transition hover:border-brand-500 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              aria-label="Page suivante"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-ink-200 text-ink-600 transition hover:border-brand-500 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            <Link
              to="/login"
              className="ml-2 rounded-sm border border-brand-600 px-4 py-2 text-xs font-bold uppercase tracking-widest text-brand-700 transition hover:bg-brand-50"
            >
              Voir tous
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {visible.map((c) => {
            const initials = c.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
            return (
              <div key={c.id} className="flex flex-col items-center gap-3 text-center">
                {c.photoUrl ? (
                  <img
                    src={c.photoUrl}
                    alt={c.name}
                    className="h-28 w-28 rounded-full border-4 border-brand-100 object-cover shadow-md transition hover:scale-105"
                  />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-brand-100 bg-gradient-to-br from-brand-500 to-brand-800 text-3xl font-extrabold text-white shadow-md transition hover:scale-105">
                    {initials}
                  </div>
                )}
                <div>
                  <p className="font-bold text-ink-900">{c.name}</p>
                  <p className="mt-0.5 text-xs font-semibold text-brand-600">{c.position}</p>
                </div>
              </div>
            );
          })}
          {Array.from({ length: PER_PAGE - visible.length }).map((_, i) => (
            <div key={`ph-${i}`} />
          ))}
        </div>

        {totalPages > 1 && (
          <div className="mt-8 flex justify-center gap-2">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPage(i)}
                aria-label={`Page ${i + 1}`}
                className="h-2 rounded-full transition-all duration-300"
                style={{ width: i === page ? 24 : 8, background: i === page ? '#059669' : '#cbd5e0' }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
