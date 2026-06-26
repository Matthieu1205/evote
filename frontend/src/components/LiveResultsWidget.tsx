import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
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
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

function AvatarDotFactory(candidate: CandidateResult, color: string, dataLen: number) {
  return function AvatarDot(props: { cx?: number; cy?: number; index?: number; value?: number }) {
    const { cx = 0, cy = 0, index = 0, value = 0 } = props;

    if (index !== dataLen - 1) {
      return <circle cx={cx} cy={cy} r={4} fill={color} stroke="white" strokeWidth={2} />;
    }

    const r = 20;
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
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="800" fill={color}>
          {initials(candidate.name)}
        </text>
      </g>
    );

    return (
      <g>
        {avatar}
        <rect x={cx + r + 5} y={cy - 12} width={firstName.length * 7 + 26} height={24} rx={5} fill={color} />
        <text x={cx + r + 10} y={cy - 3} fontSize={9} fontWeight="700" fill="white">{firstName}</text>
        <text x={cx + r + 10} y={cy + 8} fontSize={9} fontWeight="900" fill="white">{value} voix</text>
      </g>
    );
  };
}

function CustomTooltip({ active, payload }: {
  active?: boolean;
  payload?: { dataKey: string; name: string; value: number; color: string; payload?: DataPoint }[];
}) {
  if (!active || !payload?.length) return null;
  const timeLabel = payload[0]?.payload?.time ?? '';
  return (
    <div className="rounded-xl bg-white px-4 py-3 shadow-xl ring-1 ring-slate-100">
      <p className="mb-2 text-xs font-semibold text-slate-400">{timeLabel}</p>
      {payload.slice().sort((a, b) => b.value - a.value).map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 py-0.5 text-sm">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p.color }} />
          <span className="font-medium text-slate-700">{p.name}</span>
          <span className="ml-4 font-bold tabular-nums" style={{ color: p.color }}>{p.value} voix</span>
        </div>
      ))}
    </div>
  );
}

interface Props {
  electionId: string;
  electionTitle: string;
}

export function LiveResultsWidget({ electionId, electionTitle }: Props) {
  const [result, setResult] = useState<TallyResult | null>(null);
  const [history, setHistory] = useState<Record<string, DataPoint[]>>({});
  const [positionIdx, setPositionIdx] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(10);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    try {
      const data = await api.get<TallyResult>(`/elections/${electionId}/live-results`);
      setResult(data);
      setLastUpdate(new Date());
      setCountdown(10);

      const ts = Date.now();
      const time = new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      setHistory((prev) => {
        const next = { ...prev };
        for (const pos of data.positions) {
          const existing = next[pos.positionId] ?? [];
          let base = existing;
          if (existing.length === 0) {
            const zeroPoint: DataPoint = {
              ts: ts - 10_000,
              time: new Date(ts - 10_000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            };
            for (const c of pos.candidates) zeroPoint[c.userId] = 0;
            base = [zeroPoint];
          }
          const point: DataPoint = { ts, time };
          for (const c of pos.candidates) point[c.userId] = c.votes;
          next[pos.positionId] = [...base.slice(-60), point];
        }
        return next;
      });
    } catch {
      // silencieux : l'interface reste avec les dernières données
    }
  }, [electionId]);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, 10_000);
    countdownRef.current = setInterval(() => setCountdown((c) => (c <= 1 ? 10 : c - 1)), 1_000);
    return () => {
      clearInterval(interval);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [poll]);

  const position = result?.positions[positionIdx] ?? null;
  const posHistory = position ? (history[position.positionId] ?? []) : [];
  const maxVotes = position?.candidates[0]?.votes ?? 1;

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-ink-100">
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-6 py-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <h2 className="text-sm font-bold text-ink-900">{electionTitle}</h2>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
              En direct · {countdown}s
            </span>
          </div>
          {result && (
            <p className="mt-0.5 text-xs text-ink-400">
              {result.ballotsCount} bulletins · participation {result.turnout.toFixed(1)}%
            </p>
          )}
        </div>
        <Link
          to={`/vote/${electionId}/live`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
        >
          Plein écran
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
        </Link>
      </div>

      <div className="p-6">
        {/* Onglets postes */}
        {result && result.positions.length > 1 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {result.positions.map((pos, i) => (
              <button
                key={pos.positionId}
                type="button"
                onClick={() => setPositionIdx(i)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  i === positionIdx
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-ink-50 text-ink-600 hover:bg-ink-100'
                }`}
              >
                {pos.positionTitle}
              </button>
            ))}
          </div>
        )}

        {!result ? (
          <div className="flex h-48 items-center justify-center">
            <svg className="h-7 w-7 animate-spin text-brand-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : position ? (
          <>
            {/* Légende */}
            <div className="mb-4 flex flex-wrap gap-2">
              {position.candidates.map((c, i) => {
                const color = PALETTE[i % PALETTE.length];
                return (
                  <div
                    key={c.userId}
                    className="flex items-center gap-2 rounded-xl px-3 py-1.5"
                    style={{ background: color + '12', border: `1.5px solid ${color}40` }}
                  >
                    <div
                      className="h-6 w-6 shrink-0 overflow-hidden rounded-full"
                      style={{ outline: `2px solid ${color}`, outlineOffset: '1px' }}
                    >
                      {c.photoUrl ? (
                        <img src={c.photoUrl} alt={c.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[9px] font-bold" style={{ background: color + '30', color }}>
                          {initials(c.name)}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-ink-900">{c.name}</p>
                      <p className="text-[10px] font-bold" style={{ color }}>{c.votes} voix — {c.percent.toFixed(1)}%</p>
                    </div>
                    <div className="ml-1 h-0.5 w-4 rounded-full" style={{ background: color }} />
                  </div>
                );
              })}
            </div>

            {/* Graphique courbes */}
            {posHistory.length === 0 ? (
              <div className="flex h-48 items-center justify-center">
                <svg className="h-7 w-7 animate-spin text-brand-300" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={posHistory} margin={{ top: 32, right: 110, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="ts"
                    scale="time"
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={(v: number) =>
                      new Date(v).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    }
                    tick={{ fontSize: 9, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={24} />
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

            {/* Classement compact */}
            <div className="mt-4 space-y-2">
              {position.candidates.map((c, i) => {
                const color = PALETTE[i % PALETTE.length];
                const barW = maxVotes > 0 ? (c.votes / maxVotes) * 100 : 0;
                return (
                  <div key={c.userId} className="flex items-center gap-3">
                    <span className="w-5 shrink-0 text-center text-xs font-black text-ink-400">{i + 1}</span>
                    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full" style={{ outline: `2px solid ${color}40` }}>
                      {c.photoUrl ? (
                        <img src={c.photoUrl} alt={c.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] font-bold" style={{ background: color + '20', color }}>
                          {initials(c.name)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="truncate text-xs font-semibold text-ink-900">{c.name}</span>
                        <span className="ml-2 shrink-0 text-xs font-black" style={{ color }}>{c.votes} voix</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${barW}%`, background: color }} />
                      </div>
                    </div>
                    {c.elected && (
                      <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700">
                        Élu
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {lastUpdate && (
              <p className="mt-3 text-right text-[10px] text-ink-300">
                Mis à jour à {lastUpdate.toLocaleTimeString('fr-FR')}
              </p>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
