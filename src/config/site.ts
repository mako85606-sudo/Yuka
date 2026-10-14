/**
 * Identité du site. La couleur de thème du navigateur double le token
 * `--paper` (le bureau) de globals.css (les métadonnées ne lisent pas le CSS) ;
 * le test tokens.test.ts vérifie qu'elle reste synchronisée.
 */
export const site = {
  name: "Loupe",
  tagline: "Ton devis, corrigé au stylo rouge.",
  description:
    "Une photo du devis suffit. Loupe refait les calculs, repère les lignes floues, compare les prix à ceux de ta région et t'aide à rédiger ta réponse à l'artisan.",
  disclaimer: "Avis indicatif, ne remplace pas un professionnel ni un conseil juridique.",
  themeColor: "#221E19",
} as const;
