/**
 * Mots des avis de prix. Principe d'honnêteté : chaque avis dit d'où vient
 * sa référence et avec quelle confiance ; une estimation IA n'est jamais
 * présentée comme un prix de marché (ni « médiane », ni « prix du marché »).
 */

export type PriceSource =
  | { readonly kind: "loupe"; readonly comparables: number }
  | { readonly kind: "ai" };

/** Ce à quoi on compare : « la médiane » ou « l'estimation IA ». */
export function describeReference(source: PriceSource): string {
  return source.kind === "loupe" ? "la médiane" : "l'estimation IA";
}

/** Source et confiance, toujours affichées à côté de l'écart. */
export function describeSource(source: PriceSource): string {
  if (source.kind === "ai") return "Estimation IA · confiance faible";
  const plural = source.comparables > 1 ? "devis comparables" : "devis comparable";
  return `Base Loupe · ${source.comparables} ${plural}`;
}

/** « au-dessus de la médiane », « en dessous de l'estimation IA »… */
export function describeDelta(amount: number, source: PriceSource): string {
  const reference = describeReference(source);
  const rounded = Math.round(amount);
  if (rounded > 0) return `au-dessus de ${reference}`;
  if (rounded < 0) return `en dessous de ${reference}`;
  return `pile sur ${reference}`;
}
