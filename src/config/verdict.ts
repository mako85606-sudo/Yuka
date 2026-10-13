import type { RuleId } from "@/lib/analysis/result";

/**
 * Seuils du verdict. Choix de produit, pas des règles juridiques : ils
 * décident seulement du tampon (« Correct », « À négocier », « À vérifier
 * sérieusement »), jamais d'une accusation.
 */
export const verdictConfig = {
  /** Trop-payé dû aux erreurs de calcul, en euros, qui justifie « à vérifier sérieusement ». */
  alertOvercharge: 20,
  /** Prix au-dessus de la médiane de la base Loupe qui justifie de négocier (15 %). */
  negotiatePriceRatio: 0.15,
  /** … et qui justifie de vérifier sérieusement (60 %). */
  alertPriceRatio: 0.6,
  /** En dessous, une économie possible n'est pas annoncée. */
  minSavings: 5,
  maxKeyPoints: 3,
} as const;

/**
 * Mentions dont l'absence empêche de savoir à qui on a affaire : à elles
 * seules, elles justifient de vérifier sérieusement.
 */
export const CRITICAL_MENTIONS: readonly RuleId[] = ["mention-company-name", "mention-siret"];
