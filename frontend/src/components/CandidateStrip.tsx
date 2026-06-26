import { Link } from 'react-router-dom';

export interface StripCandidate {
  id: string;
  name: string;
  position: string;
  photoUrl?: string | null;
}

export function CandidateStrip({ candidates }: { candidates: StripCandidate[] }) {
  if (candidates.length === 0) return null;

  return (
    <section className="border-b border-ink-100 bg-white py-8 shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* En-tête */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-600">
              Candidatures retenues
            </p>
            <h2 className="mt-0.5 text-xl font-extrabold text-ink-900">
              Liste des candidats
            </h2>
          </div>
          <span className="rounded-full bg-ink-100 px-3 py-1 text-xs font-bold text-ink-500">
            {candidates.length} candidat{candidates.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* Bande défilante */}
        <div className="flex gap-6 overflow-x-auto pb-2 scrollbar-none">
          {candidates.map((c) => {
            const initials = c.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();

            return (
              <div
                key={c.id}
                className="group flex flex-none flex-col items-center gap-2 text-center"
                style={{ minWidth: 80 }}
              >
                {c.photoUrl ? (
                  <img
                    src={c.photoUrl}
                    alt={c.name}
                    className="h-16 w-16 rounded-full border-2 border-brand-100 object-cover shadow transition group-hover:border-brand-400 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-brand-100 bg-gradient-to-br from-brand-500 to-brand-800 text-lg font-extrabold text-white shadow transition group-hover:border-brand-400 group-hover:scale-105">
                    {initials}
                  </div>
                )}
                <div style={{ maxWidth: 80 }}>
                  <p className="truncate text-xs font-bold leading-tight text-ink-900">
                    {c.name.split(' ')[0]}
                  </p>
                  <p className="truncate text-[10px] font-semibold text-brand-600">
                    {c.position.length > 14 ? c.position.slice(0, 13) + '…' : c.position}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Bouton "voir tous" */}
          <Link
            to="/login"
            className="flex flex-none flex-col items-center justify-center gap-2"
            style={{ minWidth: 80 }}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-brand-300 bg-brand-50 text-brand-600 transition hover:bg-brand-100">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
            <p className="text-[10px] font-bold text-brand-600">Voir tous</p>
          </Link>
        </div>
      </div>
    </section>
  );
}
