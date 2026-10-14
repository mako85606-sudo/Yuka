import type { QuoteUnit } from "@/config/taxonomy";
import type { PriceSource } from "@/lib/price-wording";
import type { Verdict } from "@/lib/scene-quote";

/**
 * Ce que l'analyse conclut, après la lecture : les constats des vérifications,
 * les avis de prix et le verdict. Partagé par le serveur, le flux et
 * l'affichage.
 *
 * Principe d'honnêteté : un constat vérifié (un calcul faux, une mention
 * absente) n'est jamais mélangé à un avis de prix, qui reste une estimation
 * avec sa source et sa confiance.
 */

export type RuleId =
  | "line-calculation"
  | "total-ht"
  | "total-vat"
  | "total-ttc"
  | "vat-rate-unknown"
  | "vat-rate-category"
  | "mention-company-name"
  | "mention-address"
  | "mention-siret"
  | "mention-date"
  | "mention-validity"
  | "mention-client"
  | "mention-insurance"
  | "deposit-high"
  | "door-to-door"
  | "vague-line";

/**
 * `error` : erreur vérifiée (calcul faux, mention absente).
 * `warning` : point d'attention (ligne vague, acompte élevé, TVA inhabituelle).
 * `reminder` : rappel utile (délai de rétractation).
 */
export type FindingKind = "error" | "warning" | "reminder";

export interface Finding {
  /** Identifiant stable dans l'analyse (« line-calculation-2 »). */
  readonly id: string;
  readonly ruleId: RuleId;
  readonly kind: FindingKind;
  /**
   * Faux quand les chiffres en cause ont été lus avec une confiance faible :
   * le constat est alors présenté « à confirmer sur ton devis », jamais
   * comme une erreur sûre.
   */
  readonly confirmed: boolean;
  /** Ligne concernée (position dans le devis, à partir de 0). */
  readonly lineIndex?: number;
  /** Note courte, pour la marge (« 1 × 189,90 = 189,90, pas 198,90 »). */
  readonly note: string;
  /** Phrase complète, pour la liste et les lecteurs d'écran. */
  readonly detail: string;
  /** Écart en euros : positif en défaveur du client, négatif en sa faveur. */
  readonly amount?: number;
  /** Référence juridique, affichée seulement quand elle est vérifiée. */
  readonly legalRef?: string;
  /** Faux tant que la règle juridique n'a pas été vérifiée (TODO dans `src/config/rules.ts`). */
  readonly ruleVerified: boolean;
}

/** Ce à quoi un prix est comparé. */
export type PriceReference =
  | {
      readonly kind: "loupe";
      readonly median: number;
      readonly p25: number;
      readonly p75: number;
      readonly comparables: number;
    }
  | { readonly kind: "ai"; readonly low: number; readonly high: number };

export interface PriceOpinion {
  readonly lineIndex: number;
  /** Pour l'affichage : base Loupe (avec le nombre de comparables) ou estimation IA. */
  readonly source: PriceSource;
  readonly reference: PriceReference;
  /** Unité dans laquelle le prix est comparé. */
  readonly unit: QuoteUnit;
  /** Prix unitaire HT du devis, dans cette unité. */
  readonly unitPrice: number;
  readonly quantity: number;
  /**
   * Écart en euros pour la ligne, quantité comprise : par rapport à la
   * médiane (base Loupe) ; par rapport à la borne dépassée de la fourchette
   * (estimation IA), zéro à l'intérieur.
   */
  readonly delta: number;
}

export interface SavingsRange {
  readonly low: number;
  readonly high: number;
}

export interface VerdictResult {
  readonly verdict: Verdict;
  /** Économie possible, en euros ; `null` s'il n'y a rien à récupérer. */
  readonly savings: SavingsRange | null;
  /** Trois points clés au plus, du plus important au moins important. */
  readonly keyPoints: readonly string[];
  /** Ce que le devis facture en trop à cause de ses erreurs de calcul, si on peut le chiffrer. */
  readonly overcharge: number | null;
}
