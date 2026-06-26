import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { AppShell } from '../components/AppShell';
import { api } from '../lib/api';

interface CandidateResult {
  userId: string;
  name: string;
  photoUrl?: string | null;
  votes: number;
  percent: number;
  elected: boolean;
}

interface PositionResult {
  positionId: string;
  positionTitle: string;
  seats: number;
  totalVotes: number;
  candidates: CandidateResult[];
}

interface TallyResult {
  electionId: string;
  ballotsCount: number;
  eligibleCount: number;
  turnout: number;
  positions: PositionResult[];
  computedAt: string;
}

interface DataPoint {
  ts: number;
  time: string;
  [key: string]: number | string;
}

const PALETTE = [
  '#059669', '#3b82f6', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
];

function initials(name: string) {
  return name.split(' ').filter((n) => n.length > 0).map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

function AvatarDotFactory(
  candidate: CandidateResult,
  color: string,
  dataLen: number,
) {
  return function AvatarDot(props: {
    cx?: number; cy?: number; index?: number; value?: number;
  }) {
    const { cx = 0, cy = 0, index = 0, value = 0 } = props;

    // Points intermédiaires : petit cercle plein
    if (index !== dataLen - 1) {
      return <circle cx={cx} cy={cy} r={4} fill={color} stroke="white" strokeWidth={2} />;
    }

    // Dernier point : avatar circulaire + nom + score
    const r = 22;
    const clipId = `clip-${candidate.userId}-${dataLen}`;
    const firstName = candidate.name.split(' ')[0];

    const avatar = candidate.photoUrl ? (
      <g>
        <defs>
          <clipPath id={clipId}>
            <circle cx={cx} cy={cy} r={r - 2} />
          </clipPath>
        </defs>
        <circle cx={cx} cy={cy} r={r + 3} fill="white" />
        <circle cx={cx} cy={cy} r={r + 1} fill="white" stroke={color} strokeWidth={3} />
        <image
          href={candidate.photoUrl}
          x={cx - r + 2} y={cy - r + 2}
          width={(r - 2) * 2} height={(r - 2) * 2}
          clipPath={`url(#${clipId})`}
          preserveAspectRatio="xMidYMid slice"
        />
      </g>
    ) : (
      <g>
        <circle cx={cx} cy={cy} r={r + 3} fill="white" />
        <circle cx={cx} cy={cy} r={r + 1} fill={color + '18'} stroke={color} strokeWidth={3} />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="800" fill={color}>
          {initials(candidate.name)}
        </text>
      </g>
    );

    return (
      <g>
        {avatar}
        {/* Étiquette : prénom + score à droite de l'avatar */}
        <rect
          x={cx + r + 6} y={cy - 13}
          width={firstName.length * 7 + 28} height={26}
          rx={6}
          fill={color}
        />
        <text x={cx + r + 12} y={cy - 3} fontSize={10} fontWeight="700" fill="white">
          {firstName}
        </text>
        <text x={cx + r + 12} y={cy + 9} fontSize={10} fontWeight="900" fill="white">
          {value} voix
        </text>
      </g>
    );
  };
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { dataKey: string; name: string; value: number; color: string; payload?: DataPoint }[];
  label?: number;
}) {
  if (!active || !payload?.length) return null;
  const timeLabel = payload[0]?.payload?.time ?? (label ? new Date(label).toLocaleTimeString('fr-FR') : '');
  return (
    <div className="rounded-xl bg-white px-4 py-3 shadow-xl ring-1 ring-slate-100">
      <p className="mb-2 text-xs font-semibold text-slate-400">{timeLabel}</p>
      {payload
        .slice()
        .sort((a, b) => b.value - a.value)
        .map((p) => (
          <div key={p.dataKey} className="flex items-center gap-2 py-0.5 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p.color }} />
            <span className="font-medium text-slate-700">{p.name}</span>
            <span className="ml-4 font-bold tabular-nums" style={{ color: p.color }}>
              {p.value} voix
            </span>
          </div>
        ))}
    </div>
  );
}

export default function LiveResultsPage() {
  const { electionId } = useParams<{ electionId: string }>();
  const [result, setResult] = useState<TallyResult | null>(null);
  const [history, setHistory] = useState<Record<string, DataPoint[]>>({});
  const [positionIdx, setPositionIdx] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(10);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    try {
      const data = await api.get<TallyResult>(`/elections/${electionId}/live-results`);
      setResult(data);
      setLastUpdate(new Date());
      setError(null);
      setCountdown(10);

      const ts = Date.now();
      const time = new Date(ts).toLocaleTimeString('fr-FR', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      });

      setHistory((prev) => {
        const next = { ...prev };
        for (const pos of data.positions) {
          const existing = next[pos.positionId] ?? [];

          // Ajouter un point de départ à zéro si c'est la première entrée
          let base = existing;
          if (existing.length === 0) {
            const zeroPoint: DataPoint = { ts: ts - 10_000, time: new Date(ts - 10_000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) };
            for (const c of pos.candidates) zeroPoint[c.userId] = 0;
            base = [zeroPoint];
          }

          const point: DataPoint = { ts, time };
          for (const c of pos.candidates) {
            point[c.userId] = c.votes;
          }
          next[pos.positionId] = [...base.slice(-60), point];
        }
        return next;
      });
    } catch (err) {
      setError((err as Error).message ?? 'Erreur de connexion');
    }
  }, [electionId]);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, 10_000);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => (c <= 1 ? 10 : c - 1));
    }, 1_000);
    return () => {
      clearInterval(interval);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [poll]);

  const position = result?.positions[positionIdx] ?? null;
  const posHistory = position ? (history[position.positionId] ?? []) : [];

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to="/vote"
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-400 hover:text-ink-700"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Retour aux scrutins
          </Link>
          <h1 className="text-2xl font-black text-ink-900">Resultats en direct</h1>
          {result && (
            <p className="mt-1 text-sm text-ink-500">
              {result.ballotsCount} bulletins &middot; participation {result.turnout.toFixed(1)}%
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Live indicator */}
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 ring-1 ring-emerald-200">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-bold text-emerald-700">EN DIRECT</span>
            <span className="text-xs text-emerald-500">— {countdown}s</span>
          </div>

          <button
            type="button"
            onClick={poll}
            className="btn btn-ghost"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Actualiser
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!result ? (
        <div className="flex h-64 items-center justify-center">
          <svg className="h-8 w-8 animate-spin text-brand-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : (
        <>
          {/* Position tabs */}
          {result.positions.length > 1 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {result.positions.map((pos, i) => (
                <button
                  key={pos.positionId}
                  type="button"
                  onClick={() => setPositionIdx(i)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    i === positionIdx
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'bg-white text-ink-600 ring-1 ring-ink-200 hover:bg-ink-50'
                  }`}
                >
                  {pos.positionTitle}
                </button>
              ))}
            </div>
          )}

          {position && (
            <>
              {/* Chart card */}
              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-ink-100">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-base font-bold text-ink-900">{position.positionTitle}</h2>
                    <p className="text-xs text-ink-400">
                      {position.totalVotes} voix exprim&#233;es &middot; {position.seats} si&#232;ge(s)
                    </p>
                  </div>
                  {lastUpdate && (
                    <span className="text-xs text-ink-400">
                      Mis &#224; jour &#224; {lastUpdate.toLocaleTimeString('fr-FR')}
                    </span>
                  )}
                </div>

                {/* Légende candidats */}
                <div className="mb-4 flex flex-wrap gap-3">
                  {position.candidates.map((c, i) => {
                    const color = PALETTE[i % PALETTE.length];
                    return (
                      <div
                        key={c.userId}
                        className="flex items-center gap-2 rounded-xl px-3 py-1.5"
                        style={{ background: color + '12', border: `1.5px solid ${color}40` }}
                      >
                        <div
                          className="h-7 w-7 shrink-0 overflow-hidden rounded-full"
                          style={{ outline: `2px solid ${color}`, outlineOffset: '1px' }}
                        >
                          {c.photoUrl ? (
                            <img src={c.photoUrl} alt={c.name} className="h-full w-full object-cover" />
                          ) : (
                            <div
                              className="flex h-full w-full items-center justify-center text-[10px] font-bold"
                              style={{ background: color + '30', color }}
                            >
                              {initials(c.name)}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-ink-900">{c.name}</p>
                          <p className="text-[10px] font-bold" style={{ color }}>
                            {c.votes} voix — {c.percent.toFixed(1)}%
                          </p>
                        </div>
                        <div className="ml-1 h-0.5 w-5 rounded-full" style={{ background: color }} />
                      </div>
                    );
                  })}
                </div>

                {posHistory.length === 0 ? (
                  <div className="flex h-64 flex-col items-center justify-center gap-3 text-ink-400">
                    <svg className="h-8 w-8 animate-spin text-brand-300" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="text-sm font-medium">Chargement des donn&#233;es...</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={420}>
                    <LineChart
                      data={posHistory}
                      margin={{ top: 36, right: 100, bottom: 10, left: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="ts"
                        scale="time"
                        type="number"
                        domain={['dataMin', 'dataMax']}
                        tickFormatter={(v: number) =>
                          new Date(v).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        }
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        tickLine={false}
                        axisLine={false}
                        width={30}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      {position.candidates.map((c, i) => {
                        const color = PALETTE[i % PALETTE.length];
                        return (
                          <Line
                            key={c.userId}
                            type="monotone"
                            dataKey={c.userId}
                            name={c.name}
                            stroke={color}
                            strokeWidth={2.5}
                            dot={AvatarDotFactory(c, color, posHistory.length)}
                            activeDot={{ r: 5, strokeWidth: 0 }}
                            isAnimationActive={false}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Ranking */}
              <div className="mt-4 rounded-2xl bg-white shadow-sm ring-1 ring-ink-100 overflow-hidden">
                <div className="border-b border-ink-100 px-6 py-4">
                  <h3 className="text-sm font-bold text-ink-900">Classement actuel</h3>
                </div>
                <ul className="divide-y divide-ink-50">
                  {position.candidates.map((c, i) => {
                    const color = PALETTE[i % PALETTE.length];
                    const maxVotes = position.candidates[0]?.votes ?? 1;
                    const barW = maxVotes > 0 ? (c.votes / maxVotes) * 100 : 0;
                    return (
                      <li key={c.userId} className="flex items-center gap-4 px-6 py-4">
                        {/* Rank */}
                        <span className="w-6 shrink-0 text-center text-sm font-black text-ink-400">
                          {i + 1}
                        </span>

                        {/* Avatar */}
                        <div
                          className="h-10 w-10 shrink-0 overflow-hidden rounded-full ring-2"
                          style={{ '--tw-ring-color': color } as React.CSSProperties}
                        >
                          {c.photoUrl ? (
                            <img
                              src={c.photoUrl}
                              alt={c.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div
                              className="flex h-full w-full items-center justify-center text-sm font-bold"
                              style={{ background: color + '20', color }}
                            >
                              {initials(c.name)}
                            </div>
                          )}
                        </div>

                        {/* Info + bar */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-semibold text-ink-900">
                              {c.name}
                            </span>
                            <span className="shrink-0 text-sm font-black" style={{ color }}>
                              {c.votes} voix
                            </span>
                          </div>
                          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${barW}%`, background: color }}
                            />
                          </div>
                          <p className="mt-0.5 text-right text-[10px] font-semibold text-ink-400">
                            {c.percent.toFixed(1)}%
                          </p>
                        </div>

                        {/* Elected badge */}
                        {c.elected && (
                          <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                            Elu
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </>
          )}
        </>
      )}
    </AppShell>
  );
}
