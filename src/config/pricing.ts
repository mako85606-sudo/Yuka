/**
 * Comparaison des prix. La base Loupe ne donne une médiane qu'à partir de
 * `minComparables` lignes comparables : même prestation de la taxonomie, même
 * unité, même région, saisies il y a moins de `windowMonths` mois. En deçà,
 * une fourchette est demandée au modèle, présentée « estimation IA, confiance
 * faible ».
 */
export const pricingConfig = {
  minComparables: 5,
  windowMonths: 24,
  /** Lignes lues au plus par requête de comparables (les plus récentes). */
  maxComparablesPerItem: 400,
  /** Lignes estimées par le modèle au plus, les plus chères d'abord. */
  maxEstimatedLines: 12,
  /** En dessous de ce montant HT, une ligne ne vaut pas une estimation. */
  minEstimatedAmount: 20,
  /** Délai de l'appel d'estimation. */
  estimateTimeoutMs: 30_000,
} as const;
