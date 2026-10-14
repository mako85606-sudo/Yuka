/** Statistiques des prix comparables, calculées en TypeScript (jamais par le modèle). */

/**
 * Quantile par interpolation linéaire entre les deux valeurs voisines
 * (méthode « type 7 », celle des tableurs). `q` entre 0 et 1.
 */
export function quantile(values: readonly number[], q: number): number {
  if (values.length === 0) throw new Error("Aucune valeur");
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * Math.min(1, Math.max(0, q));
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const low = sorted[lower] ?? 0;
  const high = sorted[upper] ?? low;
  return low + (high - low) * (position - lower);
}

export function median(values: readonly number[]): number {
  return quantile(values, 0.5);
}
