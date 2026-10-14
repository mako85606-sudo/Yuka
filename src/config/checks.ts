/**
 * Réglages des vérifications qui ne sont pas des règles juridiques : marges
 * d'arrondi et seuils de prudence. Ce sont des choix de produit, pas des
 * obligations : leurs messages ne parlent jamais d'illégalité.
 */
export const checksConfig = {
  /**
   * Écart toléré sur un calcul, pour absorber les arrondis : le plus grand de
   * ces trois montants (absolu, relatif, ou un demi-centime par ligne en jeu).
   */
  toleranceEuros: 0.02,
  toleranceRatio: 0.001,
  tolerancePerLine: 0.005,
  /**
   * Acompte au-delà duquel on suggère de négocier. Seuil de prudence courant
   * pour des travaux, pas une limite légale.
   */
  depositWarningPercent: 30,
  /** Montant HT à partir duquel une ligne vague mérite une question. */
  vagueLineMinAmount: 30,
} as const;

/**
 * Mots qui, seuls, ne disent pas ce qui est facturé. Une ligne n'est vague que
 * si tous ses mots significatifs sont dans cette liste (« Forfait divers »,
 * « Fournitures »), pas si elle précise quelque chose (« Raccords et petites
 * fournitures »).
 */
export const VAGUE_WORDS: readonly string[] = [
  "divers",
  "diverses",
  "forfait",
  "forfaitaire",
  "fourniture",
  "fournitures",
  "frais",
  "prestation",
  "prestations",
  "intervention",
  "interventions",
  "travaux",
  "materiel",
  "materiels",
  "petit",
  "petits",
  "consommable",
  "consommables",
  "annexe",
  "annexes",
  "complement",
  "complementaire",
  "complementaires",
  "supplement",
  "supplementaire",
  "supplementaires",
  "autre",
  "autres",
  "global",
  "globale",
  "ensemble",
  "lot",
  "service",
  "services",
  "option",
  "options",
];
