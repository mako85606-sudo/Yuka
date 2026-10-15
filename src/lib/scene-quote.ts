import type { PriceSource } from "@/lib/price-wording";

/**
 * Ce que la scène de correction affiche : un devis reconstruit (jamais de nom,
 * d'adresse ni de numéro), ses problèmes, ses avis de prix et le verdict. Les
 * démos le remplissent avec des données fictives et complètes (`SceneQuote`) ;
 * l'écran de résultat, à partir de l'analyse réelle, avec ce qui a été lu
 * (`CorrectionQuote`, valeurs absentes permises).
 */

export type Verdict = "ok" | "negotiate" | "alert";

/** Libellés des verdicts, tels qu'imprimés sur le tampon. */
export const VERDICT_LABELS: Record<Verdict, string> = {
  ok: "Correct",
  negotiate: "À négocier",
  alert: "À vérifier sérieusement",
};

/**
 * Une ligne telle qu'imprimée sur le devis. Une vraie lecture n'a pas toujours
 * tout : une valeur absente ou illisible vaut `null`, jamais une invention.
 */
export interface PrintedLine {
  readonly id: string;
  readonly label: string;
  readonly quantity: number | null;
  /** Symbole d'unité tel qu'affiché (« u », « h », « m² »). */
  readonly unit: string | null;
  readonly unitPriceHT: number | null;
  /** Total HT tel qu'écrit sur le devis (peut être faux : c'est ce qu'on vérifie). */
  readonly totalHT: number | null;
}

/** Ligne d'une démo : tout est connu. */
export interface SceneLine extends PrintedLine {
  readonly quantity: number;
  readonly unit: string;
  readonly unitPriceHT: number;
  readonly totalHT: number;
}

/** Calcul faux, ligne vague, ou autre point d'attention sur la ligne (TVA inhabituelle). */
export type IssueKind = "calculation" | "vague-line" | "other";

/**
 * `error` : erreur vérifiée. `warning` : point d'attention (ligne vague).
 * Les deux sont entourés au stylo rouge. `unconfirmed` : chiffres mal lus,
 * à confirmer sur le devis : surligné et annoté, jamais entouré.
 */
export type IssueSeverity = "error" | "warning" | "unconfirmed";

export interface SceneIssue {
  readonly id: string;
  readonly kind: IssueKind;
  readonly lineId: string;
  /** Note manuscrite, courte. */
  readonly note: string;
  /** Explication complète, pour les lecteurs d'écran. */
  readonly detail: string;
  /** Par défaut : `error` pour un calcul, `warning` pour une ligne vague. */
  readonly severity?: IssueSeverity;
}

export type TotalRow = "totalHT" | "totalVAT" | "totalTTC";

/** Problème sur un total : entouré sur la feuille, noté dans la marge. */
export interface TotalIssue {
  readonly id: string;
  readonly row: TotalRow;
  readonly note: string;
  readonly detail: string;
  readonly severity: IssueSeverity;
}

/** `reminder` : rappel utile, sans reproche (délai de rétractation). */
export type RemarkTone = IssueSeverity | "reminder";

/** Remarque sur le devis entier (mention absente, acompte, rétractation), en bas de la feuille. */
export interface SheetRemark {
  readonly id: string;
  readonly tone: RemarkTone;
  readonly note: string;
  readonly detail: string;
}

export interface ScenePrice {
  readonly lineId: string;
  /** Écart en euros avec la référence. */
  readonly delta: number;
  readonly source: PriceSource;
}

/** Totaux tels qu'imprimés ; `null` quand le devis ne les donne pas. */
export interface PrintedTotals {
  readonly totalHT: number | null;
  readonly totalVAT: number | null;
  readonly totalTTC: number | null;
}

export interface SceneTotals extends PrintedTotals {
  readonly totalHT: number;
  readonly totalVAT: number;
  readonly totalTTC: number;
}

/** Un devis à corriger, tel qu'on le connaît à un instant donné de l'analyse. */
export interface CorrectionQuote {
  /** Identifiant stable : il fixe le tracé du tampon. */
  readonly id: string;
  /** Catégorie lisible (« Plomberie ») ; `null` tant que l'en-tête n'est pas lu. */
  readonly category: string | null;
  /** Département lisible (« Rhône (69) »). */
  readonly department: string | null;
  /** Objet du devis ; `null` tant que l'en-tête n'est pas lu. */
  readonly title: string | null;
  readonly issuedAt: Date | null;
  readonly validityDays: number | null;
  /** Faux sur une page de partage : la ligne des dates disparaît de l'en-tête. */
  readonly showDates?: boolean;
  /** Taux de TVA unique, en fraction ; `null` s'il varie ou manque. */
  readonly vatRate: number | null;
  readonly lines: readonly PrintedLine[];
  /** Totaux tels qu'écrits ; `null` tant que la lecture n'est pas finie. */
  readonly totals: PrintedTotals | null;
  readonly issues: readonly SceneIssue[];
  readonly totalIssues?: readonly TotalIssue[];
  readonly remarks?: readonly SheetRemark[];
  readonly prices: readonly ScenePrice[];
  /** `null` tant que le verdict n'est pas rendu. */
  readonly verdict: Verdict | null;
  readonly correctedAt: Date | null;
}

/** Devis d'une démo : tout est connu. */
export interface SceneQuote extends CorrectionQuote {
  readonly category: string;
  readonly department: string;
  readonly title: string;
  readonly issuedAt: Date;
  readonly validityDays: number;
  readonly vatRate: number;
  readonly lines: readonly SceneLine[];
  /** Totaux tels qu'écrits sur le devis. */
  readonly totals: SceneTotals;
  readonly verdict: Verdict;
  readonly correctedAt: Date;
}

/** Sévérité effective d'un problème de ligne. */
export function issueSeverity(issue: SceneIssue): IssueSeverity {
  return issue.severity ?? (issue.kind === "calculation" ? "error" : "warning");
}

/** Nombre de gestes de la phase de vérification : lignes, totaux, remarques. */
export function annotationCount(quote: CorrectionQuote): number {
  return quote.issues.length + (quote.totalIssues?.length ?? 0) + (quote.remarks?.length ?? 0);
}

/** Arrondi au centime. */
export function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Le bon montant d'une ligne au calcul faux : quantité × prix unitaire, au
 * centime. `null` si l'un des deux n'a pas été lu, ou si le montant imprimé
 * est déjà juste.
 */
export function correctedLineTotal(line: PrintedLine): number | null {
  if (line.quantity === null || line.unitPriceHT === null) return null;
  const expected = roundCents(line.quantity * line.unitPriceHT);
  return expected === line.totalHT ? null : expected;
}

/** Totaux cohérents à partir des lignes écrites (pour fabriquer des données fictives). */
export function totalsFromLines(lines: readonly SceneLine[], vatRate: number): SceneTotals {
  const totalHT = roundCents(lines.reduce((sum, line) => sum + line.totalHT, 0));
  const totalVAT = roundCents(totalHT * vatRate);
  return { totalHT, totalVAT, totalTTC: roundCents(totalHT + totalVAT) };
}

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count > 1 ? pluralForm : singular}`;
}

/**
 * Résumé en une phrase d'une correction, pour les lecteurs d'écran (la démo
 * animée elle-même leur est masquée).
 */
export function describeCorrection(quote: SceneQuote): string {
  const issues =
    quote.issues.length === 0
      ? "aucune erreur"
      : `${plural(quote.issues.length, "problème vérifié", "problèmes vérifiés")} (${quote.issues
          .map((issue) => issue.detail.replace(/\.$/, ""))
          .join(" ; ")})`;
  const prices = plural(quote.prices.length, "avis de prix", "avis de prix");
  return `${quote.title}, ${quote.category.toLowerCase()} : ${issues}, ${prices}. Verdict : ${VERDICT_LABELS[quote.verdict].toLowerCase()}.`;
}
