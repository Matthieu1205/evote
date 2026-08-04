import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { api } from "../lib/api";

interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  ordreNumber: string;
}
interface Candidacy {
  id: string;
  status: string;
  program?: string | null;
  photoUrl?: string | null;
  profession?: string | null;
  currentRole?: string | null;
  employer?: string | null;
  yearsExperience?: number | null;
  education?: string | null;
  age?: number | null;
  biography?: string | null;
  pastRoles?: string | null;
  motivation?: string | null;
  videoUrl?: string | null;
  documentUrl?: string | null;
  user: Candidate;
}
interface Position {
  id: string;
  title: string;
  description?: string | null;
  seats: number;
  candidacies: Candidacy[];
}
interface Election {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  currentRound: number;
  startAt: string;
  endAt: string;
  positions: Position[];
}

type Phase = "ballot" | "review" | "otp" | "done";

const STEPS = [
  { key: "ballot", label: "Bulletin" },
  { key: "review", label: "Récapitulatif" },
  { key: "otp", label: "Confirmation" },
  { key: "done", label: "Voté" },
] as const;

function StepBar({ phase }: { phase: Phase }) {
  const idx = STEPS.findIndex((s) => s.key === phase);
  return (
    <div className="mb-8 flex items-center gap-0">
      {STEPS.map((step, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <div key={step.key} className="flex flex-1 items-center">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition ${
                  done
                    ? "bg-brand-600 text-white"
                    : active
                      ? "bg-brand-50 text-brand-700 ring-2 ring-brand-600"
                      : "bg-ink-100 text-ink-400"
                }`}
              >
                {done ? (
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  >
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`mt-1 hidden text-[10px] font-semibold sm:block ${active ? "text-brand-700" : "text-ink-400"}`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`mx-1 h-0.5 flex-1 ${i < idx ? "bg-brand-500" : "bg-ink-200"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function CandidateProfileModal({
  candidacy,
  onClose,
}: {
  candidacy: Candidacy;
  onClose: () => void;
}) {
  const c = candidacy;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4 border-b border-ink-100 p-5">
          {c.photoUrl ? (
            <img
              src={c.photoUrl}
              alt=""
              className="h-16 w-16 shrink-0 rounded-2xl border border-ink-100 object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-lg font-bold text-brand-600">
              {c.user.firstName[0] ?? ""}
              {c.user.lastName[0] ?? ""}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-ink-900">
              {c.user.firstName} {c.user.lastName}
            </h3>
            <p className="mt-0.5 text-xs text-ink-400">
              {[c.profession, c.age ? `${c.age} ans` : null, c.user.ordreNumber]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-50 hover:text-ink-700"
            aria-label="Fermer"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 p-5">
          {c.biography && (
            <div>
              <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-400">
                À propos
              </h4>
              <p className="whitespace-pre-line text-sm text-ink-700">{c.biography}</p>
            </div>
          )}

          {(c.currentRole || c.employer || c.yearsExperience != null || c.education) && (
            <div>
              <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-400">Parcours professionnel</h4>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-700">
                {c.currentRole && <span><span className="text-ink-400">Fonction : </span>{c.currentRole}</span>}
                {c.employer && <span><span className="text-ink-400">Employeur : </span>{c.employer}</span>}
                {c.yearsExperience != null && <span><span className="text-ink-400">Expérience : </span>{c.yearsExperience} an(s)</span>}
                {c.education && <span><span className="text-ink-400">Diplôme : </span>{c.education}</span>}
              </div>
            </div>
          )}

          {c.pastRoles && (
            <div>
              <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-400">Mandats exercés</h4>
              <p className="whitespace-pre-line text-sm text-ink-700">{c.pastRoles}</p>
            </div>
          )}

          {c.motivation && (
            <div>
              <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-400">Motivations</h4>
              <p className="whitespace-pre-line text-sm text-ink-700">{c.motivation}</p>
            </div>
          )}

          {c.program && (
            <div>
              <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-400">
                Programme
              </h4>
              <p className="whitespace-pre-line text-sm text-ink-700">{c.program}</p>
            </div>
          )}

          {!c.biography && !c.program && (
            <p className="text-sm italic text-ink-400">
              Ce candidat n'a pas fourni de présentation détaillée.
            </p>
          )}

          {(c.videoUrl || c.documentUrl) && (
            <div className="flex flex-wrap gap-2 pt-1">
              {c.videoUrl && (
                <a
                  href={c.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-ink-200 px-3 py-2 text-xs font-semibold text-ink-700 transition hover:bg-ink-50"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" />
                  </svg>
                  Voir la vidéo
                </a>
              )}
              {c.documentUrl && (
                <a
                  href={c.documentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-ink-200 px-3 py-2 text-xs font-semibold text-ink-700 transition hover:bg-ink-50"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  Voir le document
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VoteDetailPage() {
  const { electionId } = useParams<{ electionId: string }>();
  const [election, setElection] = useState<Election | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [choices, setChoices] = useState<Record<string, string[]>>({});
  const [phase, setPhase] = useState<Phase>("ballot");
  const [otp, setOtp] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [profileFor, setProfileFor] = useState<Candidacy | null>(null);

  const load = useCallback(async () => {
    try {
      const [electionData, voteCheck] = await Promise.all([
        api.get<Election>(`/elections/${electionId}`),
        api
          .get<{ hasVoted: boolean }>(`/votes/check/${electionId}`)
          .catch(() => ({ hasVoted: false })),
      ]);
      setElection(electionData);
      setHasVoted(voteCheck.hasVoted);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [electionId]);

  useEffect(() => {
    load();
  }, [load]);

  function toggle(position: Position, candidacyId: string) {
    setChoices((prev) => {
      const cur = prev[position.id] ?? [];
      let next: string[];
      if (cur.includes(candidacyId)) {
        next = cur.filter((id) => id !== candidacyId);
      } else if (position.seats === 1) {
        next = [candidacyId];
      } else if (cur.length < position.seats) {
        next = [...cur, candidacyId];
      } else {
        next = cur;
      }
      return { ...prev, [position.id]: next };
    });
  }

  async function startOtp() {
    setError(null);
    setSubmitting(true);
    try {
      const data = await api.post<{ devCode?: string }>(`/votes/request-otp/${electionId}`);
      setDevCode(data.devCode ?? null);
      setPhase("otp");
    } catch (err) {
      setError((err as Error).message ?? "Impossible d'envoyer le code OTP.");
    }
    setSubmitting(false);
  }

  async function castVote() {
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/votes', { electionId, otp, choices });
      setPhase("done");
    } catch (err) {
      setError((err as Error).message ?? "Le vote n'a pas pu être enregistré.");
    }
    setSubmitting(false);
  }

  if (loading)
    return (
      <AppShell>
        <div className="h-40 animate-pulse rounded-2xl bg-ink-100" />
      </AppShell>
    );
  if (!election)
    return (
      <AppShell>
        <p className="text-ink-400">Scrutin introuvable.</p>
      </AppShell>
    );

  const showResults = ["DEPOUILLE", "PUBLIE"].includes(election.status);
  const validCandidacies = (p: Position) =>
    p.candidacies.filter((c) => c.status === "VALIDEE");
  const blankPositions = election.positions.filter(
    (p) => validCandidacies(p).length > 0 && (choices[p.id] ?? []).length === 0,
  );

  return (
    <AppShell>
      {/* Breadcrumb */}
      <Link
        to="/vote"
        className="inline-flex items-center gap-1 text-sm font-medium text-ink-400 transition hover:text-brand-600 mb-4"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Scrutins
      </Link>

      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-ink-900">{election.title}</h1>
        {election.description && (
          <p className="mt-1 text-sm text-ink-500">{election.description}</p>
        )}
      </div>

      {/* RÉSULTATS */}
      {showResults ? (
        <div className="flex flex-col items-center rounded-2xl bg-white py-16 text-center shadow-sm ring-1 ring-ink-100">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-100">
            <svg
              viewBox="0 0 24 24"
              className="h-8 w-8 text-teal-600"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </div>
          <h2 className="mt-4 text-lg font-bold text-ink-900">
            Résultats publiés
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            Consultez les résultats officiels du scrutin.
          </p>
          <Link
            to={`/vote/${electionId}/results`}
            className="mt-6 rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            Voir les résultats
          </Link>
        </div>
      ) : /* VOTE DÉJÀ ENREGISTRÉ */
      phase === "done" || (hasVoted && phase === "ballot") ? (
        <div className="flex flex-col items-center rounded-2xl bg-white py-16 text-center shadow-sm ring-1 ring-ink-100">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100">
            <svg
              viewBox="0 0 24 24"
              className="h-8 w-8 text-brand-600"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M5 12l5 5L20 7" />
            </svg>
          </div>
          <h2 className="mt-4 text-xl font-bold text-ink-900">
            Vote enregistré !
          </h2>
          <p className="mt-2 max-w-sm text-sm text-ink-500">
            Votre bulletin a été chiffré et déposé de manière anonyme. Merci de
            votre participation.
          </p>
          <Link
            to="/vote"
            className="mt-6 rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            Retour aux scrutins
          </Link>
        </div>
      ) : /* PAS ENCORE OUVERT */
      election.status === "PLANIFIE" ? (
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <svg
              viewBox="0 0 24 24"
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-500"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <p className="font-semibold text-amber-800">
                Le vote n'est pas encore ouvert
              </p>
              <p className="mt-0.5 text-sm text-amber-700">
                Ouverture prévue le{" "}
                <strong>
                  {new Date(election.startAt).toLocaleDateString("fr-FR", {
                    dateStyle: "long",
                  })}
                </strong>{" "}
                à{" "}
                {new Date(election.startAt).toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                .
              </p>
            </div>
          </div>
          {election.positions.map((p) => {
            const cands = validCandidacies(p);
            return (
              <div
                key={p.id}
                className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-ink-100"
              >
                <div className="border-b border-ink-100 px-5 py-4">
                  <h3 className="font-semibold text-ink-900">{p.title}</h3>
                  <p className="mt-0.5 text-xs text-ink-400">
                    {p.seats} siège{p.seats > 1 ? "s" : ""}
                  </p>
                </div>
                <div className="divide-y divide-ink-50">
                  {cands.length === 0 ? (
                    <p className="px-5 py-4 text-sm text-ink-400">
                      Aucun candidat validé.
                    </p>
                  ) : (
                    cands.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center gap-3 px-5 py-3.5"
                      >
                        {c.photoUrl ? (
                          <img
                            src={c.photoUrl}
                            alt=""
                            className="h-10 w-10 shrink-0 rounded-full border border-ink-100 object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-600">
                            {c.user.firstName[0] ?? ""}
                            {c.user.lastName[0] ?? ""}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-ink-900">
                            {c.user.firstName} {c.user.lastName}
                          </p>
                          <p className="text-xs text-ink-400">
                            {c.profession
                              ? `${c.profession} · ${c.user.ordreNumber}`
                              : c.user.ordreNumber}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setProfileFor(c)}
                          className="shrink-0 rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-semibold text-ink-600 transition hover:bg-ink-50"
                        >
                          Voir le profil
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : /* NON OUVERT */
      election.status !== "OUVERT" ? (
        <div className="rounded-2xl bg-white p-10 text-center text-ink-400 shadow-sm ring-1 ring-ink-100">
          Ce scrutin n'est pas ouvert au vote.
        </div>
      ) : (
        /* BULLETIN DE VOTE */
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <StepBar phase={phase} />

            {election.positions.map((p) => {
              const cands = validCandidacies(p);
              const selected = choices[p.id] ?? [];
              const isLocked = phase === "otp" || phase === "review";

              return (
                <div
                  key={p.id}
                  className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-ink-100"
                >
                  <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
                    <div>
                      <h3 className="font-semibold text-ink-900">{p.title}</h3>
                      {p.description && (
                        <p className="mt-0.5 text-xs text-ink-400">
                          {p.description}
                        </p>
                      )}
                    </div>
                    <span
                      className={`text-xs font-semibold ${selected.length > 0 ? "text-brand-600" : "text-ink-400"}`}
                    >
                      {p.seats > 1
                        ? `${selected.length}/${p.seats}`
                        : selected.length === 1
                          ? "✓"
                          : "—"}
                    </span>
                  </div>
                  <div className="divide-y divide-ink-50">
                    {cands.length === 0 && (
                      <p className="px-5 py-4 text-sm text-ink-400">
                        Aucun candidat validé.
                      </p>
                    )}
                    {cands.map((c) => {
                      const isSel = selected.includes(c.id);
                      return (
                        <div
                          key={c.id}
                          role="button"
                          tabIndex={isLocked ? -1 : 0}
                          aria-disabled={isLocked}
                          onClick={() => !isLocked && toggle(p, c.id)}
                          onKeyDown={(e) => {
                            if (!isLocked && (e.key === "Enter" || e.key === " ")) {
                              e.preventDefault();
                              toggle(p, c.id);
                            }
                          }}
                          className={`flex w-full items-center gap-4 px-5 py-4 text-left transition ${
                            isSel ? "bg-brand-50" : "hover:bg-ink-50/60"
                          } ${isLocked ? "cursor-default" : "cursor-pointer"}`}
                        >
                          {c.photoUrl ? (
                            <img
                              src={c.photoUrl}
                              alt=""
                              className="h-11 w-11 shrink-0 rounded-xl border border-ink-100 object-cover"
                            />
                          ) : (
                            <div
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${isSel ? "bg-brand-200 text-brand-800" : "bg-brand-100 text-brand-600"}`}
                            >
                              {c.user.firstName[0] ?? ""}
                              {c.user.lastName[0] ?? ""}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p
                              className={`font-semibold ${isSel ? "text-brand-900" : "text-ink-900"}`}
                            >
                              {c.user.firstName} {c.user.lastName}
                            </p>
                            <p className="truncate text-xs text-ink-400">
                              {c.profession
                                ? `${c.profession} · ${c.user.ordreNumber}`
                                : c.user.ordreNumber}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProfileFor(c);
                            }}
                            className="shrink-0 rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-semibold text-ink-600 transition hover:bg-ink-100"
                          >
                            Voir le profil
                          </button>
                          {/* Checkbox / radio */}
                          <div
                            className={`flex h-5 w-5 shrink-0 items-center justify-center ${p.seats > 1 ? "rounded-md" : "rounded-full"} border-2 transition ${
                              isSel
                                ? "border-brand-600 bg-brand-600 text-white"
                                : "border-ink-200"
                            }`}
                          >
                            {isSel && (
                              <svg
                                viewBox="0 0 24 24"
                                className="h-3 w-3"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3.5"
                                strokeLinecap="round"
                              >
                                <path d="M5 12l5 5L20 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Panneau de validation */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-ink-100">
              {phase === "ballot" && (
                <div className="p-5">
                  <h3 className="font-bold text-ink-900">Votre bulletin</h3>
                  <p className="mt-1 text-xs text-ink-400">
                    Sélectionnez vos candidats pour chaque poste.
                  </p>
                  <button
                    type="button"
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                    onClick={() => setPhase("review")}
                  >
                    Continuer
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
              )}

              {phase === "review" && (
                <div className="p-5">
                  <h3 className="font-bold text-ink-900">Récapitulatif</h3>
                  <p className="mt-1 text-xs text-ink-400">
                    Vérifiez vos choix avant de confirmer.
                  </p>

                  {blankPositions.length > 0 && (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                      <strong>Vote blanc :</strong> aucun choix pour{" "}
                      {blankPositions.map((p) => `"${p.title}"`).join(", ")}.
                    </div>
                  )}

                  <div className="mt-4 space-y-2">
                    {election.positions.map((p) => {
                      const cands = validCandidacies(p);
                      if (cands.length === 0) return null;
                      const sel = (choices[p.id] ?? [])
                        .map((cid) => cands.find((c) => c.id === cid))
                        .filter(Boolean) as Candidacy[];
                      return (
                        <div
                          key={p.id}
                          className="rounded-xl bg-ink-50 px-3 py-2.5"
                        >
                          <p className="text-xs font-semibold text-ink-600">
                            {p.title}
                          </p>
                          {sel.length === 0 ? (
                            <p className="mt-0.5 text-xs italic text-ink-400">
                              Vote blanc
                            </p>
                          ) : (
                            <ul className="mt-1 space-y-0.5">
                              {sel.map((c) => (
                                <li
                                  key={c.id}
                                  className="flex items-center gap-1.5 text-xs font-medium text-brand-700"
                                >
                                  <svg
                                    viewBox="0 0 24 24"
                                    className="h-3 w-3"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                  >
                                    <path d="M5 12l5 5L20 7" />
                                  </svg>
                                  {c.user.firstName} {c.user.lastName}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {error && (
                    <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
                      {error}
                    </div>
                  )}

                  <button
                    type="button"
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
                    onClick={startOtp}
                    disabled={submitting}
                  >
                    {submitting ? "Envoi…" : "Confirmer — recevoir le code OTP"}
                  </button>
                  <button
                    type="button"
                    className="mt-2 w-full rounded-xl py-2.5 text-xs font-medium text-ink-500 transition hover:bg-ink-50"
                    onClick={() => {
                      setPhase("ballot");
                      setError(null);
                    }}
                  >
                    ← Modifier mes choix
                  </button>
                </div>
              )}

              {phase === "otp" && (
                <div className="p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5 text-brand-600"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.11h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </div>
                  <h3 className="mt-3 font-bold text-ink-900">
                    Code de confirmation
                  </h3>
                  <p className="mt-1 text-xs text-ink-400">
                    Un code OTP à 6 chiffres a été envoyé à votre adresse email.
                  </p>

                  {devCode && (
                    <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                      Code de démonstration :{" "}
                      <b className="font-mono">{devCode}</b>
                    </div>
                  )}
                  {error && (
                    <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
                      {error}
                    </div>
                  )}

                  <div className="mt-4">
                    <label className="mb-1.5 block text-xs font-semibold text-ink-600">
                      Votre code OTP
                    </label>
                    <input
                      className="w-full rounded-xl border border-ink-200 py-3 text-center font-mono text-2xl font-bold tracking-[0.5em] text-ink-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                      value={otp}
                      onChange={(e) =>
                        setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="——————"
                    />
                  </div>

                  <button
                    type="button"
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
                    onClick={castVote}
                    disabled={submitting || otp.length < 6}
                  >
                    {submitting ? (
                      <>
                        <svg
                          className="h-4 w-4 animate-spin"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        Enregistrement…
                      </>
                    ) : (
                      "Confirmer mon vote"
                    )}
                  </button>

                  <p className="mt-4 text-center text-[11px] text-ink-400">
                    Votre bulletin est chiffré AES-256 et anonyme.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {profileFor && (
        <CandidateProfileModal
          candidacy={profileFor}
          onClose={() => setProfileFor(null)}
        />
      )}
    </AppShell>
  );
}
