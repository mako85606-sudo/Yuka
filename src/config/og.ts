/**
 * Couleurs de l'image de partage (`next/og`) : l'image se dessine hors du
 * navigateur, sans les variables CSS. Ce sont les tokens de `globals.css`
 * recopiés : le bureau, puis les encres de la feuille ; `tokens.test.ts`
 * vérifie qu'ils restent identiques.
 */
export const ogColors = {
  desk: "#221E19",
  paperRaised: "#F2ECDD",
  ink: "#2B2119",
  inkMuted: "#6E6150",
  penRed: "#D63A2B",
  verdictOk: "#2B2119",
  verdictNegotiate: "#B5601A",
  verdictAlert: "#D63A2B",
} as const;

/** Ombre de la feuille sur le bureau : courte et nette (pas un token, une ombre). */
export const ogShadow = "0 6px 14px rgba(10, 8, 5, 0.6)";

/** Taille de l'image de partage (format recommandé par Open Graph). */
export const ogSize = { width: 1200, height: 630 } as const;
