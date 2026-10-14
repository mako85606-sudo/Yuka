/**
 * Couleurs de l'image de partage (`next/og`) : l'image se dessine hors du
 * navigateur, sans les variables CSS. Ce sont les tokens de `globals.css`
 * recopiés ; `tokens.test.ts` vérifie qu'ils restent identiques.
 */
export const ogColors = {
  /** Le fond gris-vert très pâle des sections (`--mist`). */
  page: "#F3F6F4",
  card: "#FFFFFF",
  ink: "#0E1B16",
  inkMuted: "#56645E",
  brand: "#17C26B",
  brandStrong: "#0A7A45",
  brandSoft: "#E6F8EE",
  warningSoft: "#FFF4E5",
  errorSoft: "#FDECEA",
  verdictOk: "#0A7A45",
  verdictNegotiate: "#C2410C",
  verdictAlert: "#D92D20",
} as const;

/** Ombre douce de la carte (pas un token, une ombre). */
export const ogShadow = "0 24px 48px -20px rgba(14, 27, 22, 0.28)";

/** Taille de l'image de partage (format recommandé par Open Graph). */
export const ogSize = { width: 1200, height: 630 } as const;
