/**
 * Identité du site. Les couleurs de thème du navigateur doublent les tokens
 * `--paper` de globals.css (les métadonnées ne lisent pas le CSS) ; le test
 * tokens.test.ts vérifie qu'elles restent synchronisées.
 */
export const site = {
  name: "Loupe",
  tagline: "Ton devis, corrigé au stylo rouge.",
  description:
    "Prends ton devis en photo. Loupe repère les erreurs de calcul, les lignes floues et les prix qui dépassent, puis te prépare un message pour négocier.",
  disclaimer: "Avis indicatif, ne remplace pas un professionnel ni un conseil juridique.",
  themeColor: {
    light: "#F6F3EC",
    dark: "#2A2722",
  },
} as const;
