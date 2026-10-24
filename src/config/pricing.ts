/**
 * Comparaison des prix. La base Loupe ne donne une médiane qu'à partir de
 * `minComparables` lignes comparables : même prestation de la taxonomie, même
 * unité, même région, saisies il y a moins de `windowMonths` mois, sur au
 * moins `minComparableDays` jours différents, `maxComparablesPerDay` par jour
 * au plus. En deçà, une fourchette est demandée au modèle, présentée
 * « estimation IA, confiance faible ».
 */
export const pricingConfig = {
  minComparables: 5,
  /**
   * Lignes comptées au plus par jour pour une même prestation et une même
   * région : quelques faux devis envoyés le même jour ne font pas une médiane.
   */
  maxComparablesPerDay: 3,
  /** Jours différents (date d'enregistrement) parmi les comparables, au moins. */
  minComparableDays: 3,
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
