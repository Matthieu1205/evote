import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
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
  needsRunoff: boolean;
}

interface TallyResult {
  electionId: string;
  round: number;
  ballotsCount: number;
  eligibleCount: number;
  turnout: number;
  positions: PositionResult[];
  computedAt: string;
}

interface Election {
  id: string;
  title: string;
  status: string;
}

const BASE_URL = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3001';

function printPV(election: Election, result: TallyResult) {
  const date = new Date(result.computedAt).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });
  const positionsHtml = result.positions.map((pos) => {
    const rows = pos.candidates.map((c, i) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;">${i + 1}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${c.name}${c.elected ? ' <span style="background:#d1fae5;color:#065f46;font-size:11px;padding:2px 8px;border-radius:99px;font-weight:700;">ÉLU</span>' : ''}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">${c.votes}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">${c.percent.toFixed(1)}%</td>
      </tr>
    `).join('');
    return `
      <div style="margin-bottom:32px;">
        <h3 style="font-size:15px;font-weight:700;color:#0f172a;margin:0 0 4px;">${pos.positionTitle}</h3>
        <p style="font-size:12px;color:#64748b;margin:0 0 12px;">${pos.seats} siège${pos.seats > 1 ? 's' : ''} · ${pos.totalVotes} vote${pos.totalVotes !== 1 ? 's' : ''}</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead><tr style="background:#f8fafc;">
            <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#94a3b8;">#</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#94a3b8;">Candidat</th>
            <th style="padding:8px 12px;text-align:center;font-size:11px;text-transform:uppercase;color:#94a3b8;">Voix</th>
            <th style="padding:8px 12px;text-align:center;font-size:11px;text-transform:uppercase;color:#94a3b8;">%</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        ${pos.needsRunoff ? '<p style="margin-top:8px;font-size:12px;color:#b45309;font-weight:600;">⚠ Second tour requis</p>' : ''}
      </div>
    `;
  }).join('');

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
    <title>PV — ${election.title}</title>
    <style>
      body{font-family:Georgia,serif;color:#0f172a;padding:40px;max-width:780px;margin:0 auto;}
      @media print{body{padding:20px;}}
      h1{font-size:22px;margin:0 0 4px;}
      hr{border:none;border-top:2px solid #0f172a;margin:20px 0;}
      .meta{font-size:12px;color:#64748b;margin-bottom:24px;}
      .stats{display:flex;gap:24px;margin-bottom:32px;}
      .stat{text-align:center;flex:1;border:1px solid #e2e8f0;border-radius:8px;padding:12px;}
      .stat-val{font-size:28px;font-weight:700;color:#0f172a;}
      .stat-lbl{font-size:11px;color:#64748b;margin-top:4px;}
      .footer{margin-top:40px;font-size:11px;color:#94a3b8;text-align:center;}
    </style>
  </head><body>
    <p style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.1em;margin:0 0 8px;">Procès-verbal de dépouillement</p>
    <h1>${election.title}</h1>
    <hr>
    <div class="meta">Dépouillement effectué le ${date} · Résultats ${election.status === 'PUBLIE' ? 'officiels' : 'provisoires (non publiés)'}</div>
    <div class="stats">
      <div class="stat"><div class="stat-val">${result.ballotsCount}</div><div class="stat-lbl">Bulletins exprimés</div></div>
      <div class="stat"><div class="stat-val">${result.eligibleCount}</div><div class="stat-lbl">Électeurs éligibles</div></div>
      <div class="stat"><div class="stat-val">${result.turnout.toFixed(1)}%</div><div class="stat-lbl">Taux de participation</div></div>
    </div>
    ${positionsHtml}
    <div class="footer">Document généré par eVote — ${new Date().toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })}</div>
  </body></html>`;

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}

export default function ElectionResultsPage() {
  const { electionId } = useParams<{ electionId: string }>();
  const [result, setResult] = useState<TallyResult | null>(null);
  const [election, setElection] = useState<Election | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!electionId) return;
    Promise.all([
      api.get<TallyResult>(`/elections/${electionId}/results`),
      api.get<Election>(`/elections/${electionId}`),
    ])
      .then(([r, e]) => {
        setResult(r);
        setElection(e);
      })
      .catch((err) => setError((err as Error).message ?? 'Erreur'));
  }, [electionId]);

  if (error) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-lg font-semibold text-red-600">{error}</p>
          <p className="mt-2 text-sm text-ink-400">Les résultats ne sont pas encore disponibles.</p>
          <Link to="/vote" className="mt-6 btn-ghost">Retour aux scrutins</Link>
        </div>
      </AppShell>
    );
  }

  if (!result || !election) {
    return (
      <AppShell>
        <div className="flex min-h-64 items-center justify-center">
          <span className="text-ink-400">Chargement des résultats…</span>
        </div>
      </AppShell>
    );
  }

  const isPublished = election.status === 'PUBLIE';

  async function downloadPV() {
    try {
      const blob = await api.getBlob(`/elections/${electionId}/results/pv`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proces-verbal-${electionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert((e as Error).message ?? 'Erreur lors du téléchargement du PV.');
    }
  }

  return (
    <AppShell>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Link to="/vote" className="text-sm text-ink-400 hover:text-ink-700">Scrutins</Link>
            <span className="text-ink-300">/</span>
            <span className="text-sm text-ink-600">{election.title}</span>
          </div>
          <h1 className="mt-1 text-3xl font-bold text-ink-900">Résultats</h1>
          {!isPublished && (
            <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
              Dépouillé — non encore publié
            </span>
          )}
          {isPublished && (
            <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">
              Résultats officiels publiés
            </span>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <button
            type="button"
            onClick={downloadPV}
            className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-700 shadow-sm hover:bg-ink-50 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" /><polyline points="9 15 12 18 15 15" />
            </svg>
            Télécharger le PV (PDF)
          </button>
          <button type="button" onClick={() => printPV(election, result)}
            className="text-xs font-medium text-ink-400 hover:text-ink-600">
            Version imprimable
          </button>
        </div>
      </div>

      {/* Stats globales */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-ink-100 text-center">
          <p className="text-3xl font-bold text-ink-900">{result.ballotsCount}</p>
          <p className="mt-1 text-sm text-ink-500">Bulletins exprimés</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-ink-100 text-center">
          <p className="text-3xl font-bold text-ink-900">{result.eligibleCount}</p>
          <p className="mt-1 text-sm text-ink-500">Électeurs éligibles</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-ink-100 text-center">
          <p className="text-3xl font-bold text-brand-600">{result.turnout.toFixed(1)}%</p>
          <p className="mt-1 text-sm text-ink-500">Taux de participation</p>
          <div className="mt-2 h-2 w-full rounded-full bg-ink-100">
            <div
              className="h-2 rounded-full bg-brand-500 transition-all"
              style={{ width: `${Math.min(result.turnout, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Résultats par poste */}
      <div className="mt-8 space-y-6">
        {result.positions.map((pos) => (
          <div key={pos.positionId} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-ink-100">
            <div className="flex items-center justify-between border-b border-ink-100 px-6 py-4">
              <div>
                <h2 className="text-base font-bold text-ink-900">{pos.positionTitle}</h2>
                <p className="text-xs text-ink-400">
                  {pos.seats} siège{pos.seats > 1 ? 's' : ''} · {pos.totalVotes} vote{pos.totalVotes > 1 ? 's' : ''}
                </p>
              </div>
              {pos.needsRunoff && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                  Second tour requis
                </span>
              )}
            </div>

            <ul className="divide-y divide-ink-50 px-6">
              {pos.candidates.map((c, idx) => {
                const avatarUrl = c.photoUrl
                  ? c.photoUrl.startsWith('http') ? c.photoUrl : `${BASE_URL}${c.photoUrl}`
                  : null;
                return (
                  <li key={c.userId} className="flex items-center gap-4 py-4">
                    {/* Rank */}
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      idx === 0 ? 'bg-amber-100 text-amber-700' :
                      idx === 1 ? 'bg-slate-100 text-slate-600' :
                      idx === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-ink-50 text-ink-400'
                    }`}>
                      {idx + 1}
                    </span>

                    {/* Avatar */}
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-ink-100">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={c.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-bold text-ink-400">
                          {c.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Name + bar */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-semibold text-ink-900">{c.name}</span>
                        {c.elected && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-semibold text-teal-700">
                            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                              <path d="M5 12l5 5L20 7" />
                            </svg>
                            Élu
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 h-2 w-full rounded-full bg-ink-100">
                        <div
                          className={`h-2 rounded-full transition-all ${c.elected ? 'bg-teal-500' : 'bg-brand-400'}`}
                          style={{ width: `${c.percent}%` }}
                        />
                      </div>
                    </div>

                    {/* Votes + percent */}
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-ink-900">{c.votes} vote{c.votes > 1 ? 's' : ''}</p>
                      <p className="text-xs text-ink-400">{c.percent.toFixed(1)}%</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-ink-400">
        Dépouillement effectué le {new Date(result.computedAt).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })}
      </p>
    </AppShell>
  );
}
