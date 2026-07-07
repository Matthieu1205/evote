import { useEffect, useState, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

interface HourDatum { label: string; votes: number }
interface DayDatum { label: string; votes: number }

interface ChartData {
  votesByHour: HourDatum[];
  votesByDay: DayDatum[];
}

const REFRESH_MS = 30_000;

export function DashboardCharts() {
  const [data, setData] = useState<ChartData | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = useCallback(async () => {
    const base = import.meta.env.PROD ? '/api' : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');
    const token = localStorage.getItem('evote_token');
    try {
      const res = await fetch(`${base}/dashboard/charts`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        setData({ votesByHour: [], votesByDay: [] });
        return;
      }
      const raw = await res.json();
      setData({
        votesByHour: (raw.votesByHour ?? []).map((d: any) => ({
          label: String(d.hour ?? '').slice(11) + 'h',
          votes: d.count ?? 0,
        })),
        votesByDay: (raw.votesByDay ?? []).map((d: any) => ({
          label: String(d.date ?? '').slice(5),
          votes: d.count ?? 0,
        })),
      });
      setLastRefresh(new Date());
    } catch {
      setData({ votesByHour: [], votesByDay: [] });
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <ChartCard
        title="Votes — 24 dernières heures"
        subtitle={data ? `${(data.votesByHour ?? []).reduce((s, d) => s + d.votes, 0)} votes enregistrés` : 'Chargement…'}
        lastRefresh={lastRefresh}
        color="#059669"
        gradientId="g24h"
        data={data?.votesByHour ?? null}
        emptyLabel="Aucun vote dans les dernières 24 h."
      />
      <ChartCard
        title="Votes — 7 derniers jours"
        subtitle={data ? `${(data.votesByDay ?? []).reduce((s, d) => s + d.votes, 0)} votes cette semaine` : 'Chargement…'}
        lastRefresh={lastRefresh}
        color="#047857"
        gradientId="g7d"
        data={data?.votesByDay ?? null}
        emptyLabel="Aucun vote cette semaine."
      />
    </div>
  );
}

interface CardProps {
  title: string;
  subtitle: string;
  lastRefresh: Date | null;
  color: string;
  gradientId: string;
  data: { label: string; votes: number }[] | null;
  emptyLabel: string;
}

function ChartCard({ title, subtitle, lastRefresh, color, gradientId, data, emptyLabel }: CardProps) {
  const isEmpty = data !== null && data.every((d) => d.votes === 0);

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink-900">{title}</h2>
          <p className="mt-0.5 text-xs text-ink-400">{subtitle}</p>
        </div>
        <RefreshBadge lastRefresh={lastRefresh} />
      </div>

      <div className="mt-5">
        {data === null ? (
          <div className="flex h-[220px] items-center justify-center">
            <span className="text-sm text-ink-400">Chargement…</span>
          </div>
        ) : isEmpty ? (
          <div className="flex h-[220px] items-center justify-center">
            <p className="text-sm text-ink-400">{emptyLabel}</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="label"
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
              />
              <Tooltip
                formatter={(v) => {
                  const n = Number(v ?? 0);
                  return [`${n} vote${n !== 1 ? 's' : ''}`, ''];
                }}
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
                cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '4 2' }}
              />
              <Area
                type="monotone"
                dataKey="votes"
                stroke={color}
                strokeWidth={2.5}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={{ r: 5, fill: color, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function RefreshBadge({ lastRefresh }: { lastRefresh: Date | null }) {
  if (!lastRefresh) return null;
  const hh = lastRefresh.getHours().toString().padStart(2, '0');
  const mm = lastRefresh.getMinutes().toString().padStart(2, '0');
  const ss = lastRefresh.getSeconds().toString().padStart(2, '0');
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-semibold text-brand-700">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500" />
      {hh}:{mm}:{ss}
    </span>
  );
}
