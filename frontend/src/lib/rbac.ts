export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Administrateur",
  ADMIN: "Administrateur",
  COMMISSION: "Commission électorale",
  OBSERVATEUR: "Observateur",
  CANDIDAT: "Candidat",
  ELECTEUR: "Électeur",
};

export const ASSIGNABLE_ROLE_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(ROLE_LABELS).filter(([role]) => role !== "SUPER_ADMIN")
);
