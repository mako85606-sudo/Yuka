import type { Category } from "@/config/taxonomy";
import type { RuleId } from "@/lib/analysis/result";
import type { ExtractionIssuer } from "@/lib/extraction/schema";

/**
 * Règles juridiques utilisées par les vérifications.
 *
 * Forme demandée par le brief : `{ id, severity, message, legalRef, verified }`.
 * `verified: false` signifie que la règle n'a pas encore été vérifiée dans un
 * texte officiel : elle reste utilisée (le constat, lui, est un fait : la
 * mention est absente du devis), mais sa référence n'est jamais affichée et
 * le message reste prudent (« en principe »).
 *
 * TODO: vérifier — chaque règle ci-dessous (texte, champ d'application par
 * corps de métier, référence) auprès de sources officielles (Légifrance,
 * DGCCRF, service-public.fr) avant de passer `verified` à `true`.
 */

export type RuleSeverity = "error" | "warning";

export interface MentionRule {
  readonly id: RuleId;
  /** Ce qui doit figurer sur le devis. */
  readonly field: keyof ExtractionIssuer | "quoteDate";
  /** Corps de métier concernés. */
  readonly categories: readonly Category[] | "all";
  readonly severity: RuleSeverity;
  /** Note courte, pour la marge. */
  readonly note: string;
  readonly message: string;
  readonly legalRef: string;
  readonly verified: boolean;
}

/** Corps de métier du bâtiment, où l'assurance décennale est en jeu. */
const BUILDING_TRADES: readonly Category[] = ["travaux", "plomberie", "electricite", "chauffage"];

export const MENTION_RULES: readonly MentionRule[] = [
  {
    id: "mention-company-name",
    field: "hasCompanyName",
    categories: "all",
    severity: "error",
    note: "Qui a fait ce devis ?",
    message: "Le nom de l'entreprise n'apparaît pas sur le devis. Il y figure en principe obligatoirement.",
    // TODO: vérifier
    legalRef: "Arrêté du 24 janvier 2017 (dépannage, réparation et entretien au domicile)",
    verified: false,
  },
  {
    id: "mention-address",
    field: "hasAddress",
    categories: "all",
    severity: "error",
    note: "Adresse de l'entreprise absente",
    message: "L'adresse de l'entreprise n'apparaît pas sur le devis. Elle y figure en principe obligatoirement.",
    // TODO: vérifier
    legalRef: "Arrêté du 24 janvier 2017 (dépannage, réparation et entretien au domicile)",
    verified: false,
  },
  {
    id: "mention-siret",
    field: "hasSiret",
    categories: "all",
    severity: "error",
    note: "Pas de SIRET",
    message:
      "Aucun numéro SIRET ou SIREN sur le devis. Une entreprise immatriculée l'indique en principe sur ses documents commerciaux : demande-le, et vérifie-le sur l'annuaire des entreprises.",
    // TODO: vérifier
    legalRef: "Code de commerce, art. R123-237",
    verified: false,
  },
  {
    id: "mention-date",
    field: "quoteDate",
    categories: "all",
    severity: "warning",
    note: "Devis non daté",
    message: "Le devis n'est pas daté. Sans date, sa durée de validité ne veut rien dire.",
    // TODO: vérifier
    legalRef: "Arrêté du 24 janvier 2017 (dépannage, réparation et entretien au domicile)",
    verified: false,
  },
  {
    id: "mention-validity",
    field: "hasValidityDate",
    categories: "all",
    severity: "warning",
    note: "Valable jusqu'à quand ?",
    message:
      "Le devis n'indique pas sa durée de validité. Demande jusqu'à quand les prix sont garantis.",
    // TODO: vérifier
    legalRef: "Arrêté du 24 janvier 2017 (dépannage, réparation et entretien au domicile)",
    verified: false,
  },
  {
    id: "mention-client",
    field: "hasClientIdentity",
    categories: "all",
    severity: "warning",
    note: "Pour qui, et où ?",
    message:
      "Le devis ne dit ni à qui il s'adresse ni où ont lieu les travaux. Demande qu'il soit complété.",
    // TODO: vérifier
    legalRef: "Arrêté du 24 janvier 2017 (dépannage, réparation et entretien au domicile)",
    verified: false,
  },
  {
    id: "mention-insurance",
    field: "hasInsuranceMention",
    categories: BUILDING_TRADES,
    severity: "warning",
    note: "Assurance décennale ?",
    message:
      "Le devis ne mentionne pas d'assurance professionnelle. Pour des travaux de bâtiment, l'assurance décennale est en principe indiquée sur le devis : demande l'attestation.",
    // TODO: vérifier
    legalRef: "Code des assurances, art. L243-2",
    verified: false,
  },
];

/** Taux de TVA en vigueur en France métropolitaine, en pourcentage (0 : franchise en base). */
export const VAT_RATES_IN_FORCE: readonly number[] = [20, 10, 5.5, 2.1, 0];

/**
 * Taux habituels par corps de métier. Les taux réduits (10 %, 5,5 %)
 * concernent des travaux dans un logement de plus de deux ans, sous
 * conditions ; un garage ou un déménageur facture au taux normal.
 *
 * TODO: vérifier — taux applicables par corps de métier (BOFiP, TVA-LIQ-30).
 */
export const USUAL_VAT_RATES: Record<Category, readonly number[]> = {
  auto: [20, 0],
  plomberie: [20, 10, 5.5, 0],
  electricite: [20, 10, 5.5, 0],
  chauffage: [20, 10, 5.5, 0],
  travaux: [20, 10, 5.5, 0],
  serrurerie: [20, 10, 0],
  demenagement: [20, 0],
  sante: VAT_RATES_IN_FORCE,
  autre: VAT_RATES_IN_FORCE,
};

/**
 * Contrat conclu hors établissement (démarchage, signature au domicile) :
 * délai de rétractation.
 *
 * TODO: vérifier — durée et point de départ du délai, et la règle voisine
 * sur l'absence de paiement pendant les premiers jours (Code de la
 * consommation, art. L221-10), à ajouter ici une fois vérifiée.
 */
export const DOOR_TO_DOOR_RULE = {
  withdrawalDays: 14,
  legalRef: "Code de la consommation, art. L221-18",
  verified: false,
} as const;
