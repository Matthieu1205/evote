import { useEffect } from 'react';

/**
 * Applique la couleur de marque de l'organisation connectée en surchargeant
 * la variable CSS --color-brand-600 sur la racine du document. Retire la
 * surcharge au démontage / changement d'organisation pour revenir au vert
 * eVote par défaut.
 */
export function useOrgBranding(primaryColor?: string | null) {
  useEffect(() => {
    if (!primaryColor) return;
    document.documentElement.style.setProperty('--color-brand-600', primaryColor);
    return () => {
      document.documentElement.style.removeProperty('--color-brand-600');
    };
  }, [primaryColor]);
}
