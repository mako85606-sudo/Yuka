/**
 * Identité du site. Les couleurs de thème du navigateur doublent les tokens
 * `--paper` de globals.css (les métadonnées ne lisent pas le CSS) ; le test
 * tokens.test.ts vérifie qu'elles restent synchronisées.
 */
export const site = {
  name: "Loupe",
  tagline: "Ton devis, corrigé au stylo rouge.",
  description:
    "Une photo du devis suffit. Loupe refait les calculs, repère les lignes floues, compare les prix à ceux de ta région et t'aide à rédiger ta réponse à l'artisan.",
  disclaimer: "Avis indicatif, ne remplace pas un professionnel ni un conseil juridique.",
  themeColor: {
    light: "#F6F3EC",
    dark: "#2A2722",
  },
} as const;
