/**
 * Identité du site. La couleur de thème du navigateur double le token
 * `--paper` (le fond de page) de globals.css (les métadonnées ne lisent pas le
 * CSS) ; le test tokens.test.ts vérifie qu'elle reste synchronisée.
 */
export const site = {
  name: "Loupe",
  tagline: "Ne payez plus un devis trop cher.",
  description:
    "Une photo de votre devis suffit. Loupe vérifie les calculs, les mentions obligatoires et les prix, vous dit combien vous pouvez économiser et prépare votre message à l'artisan.",
  disclaimer: "Avis indicatif, ne remplace pas un professionnel ni un conseil juridique.",
  themeColor: "#FFFFFF",
} as const;
