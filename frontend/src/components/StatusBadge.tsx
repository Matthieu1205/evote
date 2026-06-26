const MAP: Record<string, string> = {
  // Élections
  BROUILLON: 'bg-ink-100 text-ink-600',
  PLANIFIE: 'bg-blue-100 text-blue-600',
  OUVERT: 'bg-brand-100 text-brand-700',
  CLOS: 'bg-amber-100 text-amber-700',
  DEPOUILLE: 'bg-violet-100 text-violet-700',
  PUBLIE: 'bg-brand-600 text-white',
  // Membres
  ACTIF: 'bg-brand-100 text-brand-700',
  SUSPENDU: 'bg-amber-100 text-amber-700',
  RADIE: 'bg-red-100 text-red-700',
  RETRAITE: 'bg-ink-100 text-ink-600',
  // Candidatures
  SOUMISE: 'bg-blue-100 text-blue-600',
  VALIDEE: 'bg-brand-100 text-brand-700',
  REJETEE: 'bg-red-100 text-red-700',
  RETIREE: 'bg-ink-100 text-ink-600',
};

const LABELS: Record<string, string> = {
  BROUILLON: 'Brouillon',
  PLANIFIE: 'Planifié',
  OUVERT: 'Ouvert',
  CLOS: 'Clos',
  DEPOUILLE: 'Dépouillé',
  PUBLIE: 'Publié',
  ACTIF: 'Actif',
  SUSPENDU: 'Suspendu',
  RADIE: 'Radié',
  RETRAITE: 'Retraité',
  SOUMISE: 'Soumise',
  VALIDEE: 'Validée',
  REJETEE: 'Rejetée',
  RETIREE: 'Retirée',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${MAP[status] ?? 'bg-ink-100 text-ink-600'}`}>
      {LABELS[status] ?? status}
    </span>
  );
}
