/**
 * Couleurs de l'image de partage (`next/og`) : l'image se dessine hors du
 * navigateur, sans les variables CSS. Ce sont les tokens du thème clair de
 * `globals.css`, recopiés ; `tokens.test.ts` vérifie qu'ils restent identiques.
 */
export const ogColors = {
  paper: "#F6F3EC",
  paperRaised: "#FFFDF8",
  ink: "#16140F",
  inkMuted: "#6B655A",
  penRed: "#D7372B",
  annotationBlue: "#2C4E9B",
  highlighterMark: "#FFE45C",
  verdictOk: "#1E7F4A",
  verdictNegotiate: "#B26C25",
  verdictAlert: "#D7372B",
} as const;

/** Taille de l'image de partage (format recommandé par Open Graph). */
export const ogSize = { width: 1200, height: 630 } as const;
