import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

interface Props {
  endAt: string;
  startAt: string;
  title: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function compute(endAt: string): TimeLeft {
  const diff = Math.max(0, new Date(endAt).getTime() - Date.now());
  return {
    total: diff,
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1_000),
  };
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function ProgressBar({ startAt, endAt }: { startAt: string; endAt: string }) {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const calc = () => {
      const start = new Date(startAt).getTime();
      const end = new Date(endAt).getTime();
      const now = Date.now();
      const elapsed = Math.max(0, now - start);
      const total = end - start;
      setPct(total > 0 ? Math.min(100, (elapsed / total) * 100) : 100);
    };
    calc();
    const id = setInterval(calc, 60_000);
    return () => clearInterval(id);
  }, [startAt, endAt]);

  return (
    <div>
      <div className="mb-2 flex justify-between text-xs font-semibold text-brand-300/60">
        <span>Ouverture</span>
        <span>{(100 - pct).toFixed(0)} % restant</span>
        <span>Clôture</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, background: 'linear-gradient(to right, #6ee7b7, #10b981)' }}
        />
      </div>
    </div>
  );
}

export function CountdownTimer({ endAt, startAt, title }: Props) {
  const [t, setT] = useState<TimeLeft | null>(null);

  useEffect(() => {
    setT(compute(endAt));
    const id = setInterval(() => setT(compute(endAt)), 1000);
    return () => clearInterval(id);
  }, [endAt]);

  const ended = t !== null && t.total === 0;
  const notStarted = t === null ? false : Date.now() < new Date(startAt).getTime();

  const units = [
    { value: t?.days ?? 0, label: 'Jours' },
    { value: t?.hours ?? 0, label: 'Heures' },
    { value: t?.minutes ?? 0, label: 'Minutes' },
    { value: t?.seconds ?? 0, label: 'Secondes' },
  ];

  const statusLabel = notStarted ? 'À VENIR' : ended ? 'TERMINÉ' : 'EN COURS';
  const statusColor = notStarted ? 'bg-amber-500' : ended ? 'bg-ink-400' : 'bg-red-500';

  return (
    <section id="countdown" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div
          className="relative overflow-hidden rounded-3xl shadow-2xl"
          style={{ background: 'linear-gradient(160deg, #45CCAA 0%, #448170 55%, #466E63 100%)' }}
        >
          <div className="relative px-10 pb-0 pt-10 sm:px-14 sm:pt-16">
            <div className="mb-6 flex flex-col items-center gap-4 text-center">
              <span className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-widest text-white ${statusColor}`}>
                {!ended && !notStarted && (
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                  </span>
                )}
                {statusLabel}
              </span>
              <h2 className="text-2xl font-extrabold leading-snug text-white sm:text-3xl">{title}</h2>
              <p className="text-sm font-medium text-brand-300">
                {notStarted ? 'Ouverture du scrutin dans' : ended ? 'Le scrutin est clos — résultats disponibles' : 'Temps restant avant la clôture des urnes'}
              </p>
            </div>

            {!ended ? (
              <div className="mt-4 flex items-center justify-center gap-2 sm:gap-4">
                {units.map(({ value, label }, i) => (
                  <div key={label} className="flex items-center gap-2 sm:gap-4">
                    <div className="flex flex-col items-center gap-2">
                      <div
                        className="flex items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10 shadow-inner"
                        style={{ width: 'clamp(68px, 16vw, 110px)', height: 'clamp(76px, 18vw, 118px)' }}
                      >
                        <span className="font-black tabular-nums text-white drop-shadow-sm" style={{ fontSize: 'clamp(2rem, 6.5vw, 3.75rem)', lineHeight: 1 }}>
                          {pad(value)}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-300">{label}</span>
                    </div>
                    {i < units.length - 1 && (
                      <span className="mb-6 select-none font-black text-brand-400" style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)' }}>:</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-center text-4xl font-black text-brand-300">Les urnes sont fermées.</p>
            )}

            <div className="mt-10">
              <ProgressBar startAt={startAt} endAt={endAt} />
            </div>

            <div className="mt-8 -mx-10 sm:-mx-14">
              <Link
                to="/login"
                className="flex w-full items-center justify-center gap-2 bg-white py-5 text-sm font-black uppercase tracking-widest text-brand-800 transition hover:bg-brand-50"
              >
                {ended ? 'Consulter les résultats' : 'Accéder à la plateforme de vote'}
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
