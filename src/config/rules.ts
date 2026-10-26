import type { Category } from "@/config/taxonomy";
import type { RuleId } from "@/lib/analysis/result";
import type { ExtractionIssuer } from "@/lib/extraction/schema";

/**
 * Règles juridiques utilisées par les vérifications.
 *
 * Forme demandée par le brief : `{ id, severity, message, legalRef, verified }`,
 * la référence étant donnée par corps de métier (`legalRefs`) : un même texte
 * ne vaut pas pour un plombier, un garage et un déménageur.
 *
 * `verified: false` signifie que la règle n'a pas encore été vérifiée dans un
 * texte officiel lu en entier : elle reste utilisée (le constat, lui, est un
 * fait : la mention est absente du devis), mais sa référence n'est jamais
 * affichée et le message reste prudent (« en principe »).
 *
 * Sources relevées le 24 octobre 2026 à travers les extraits des sites
 * officiels (Légifrance, economie.gouv.fr, service-public.fr, BOFiP), sans
 * lecture du texte intégral : les adresses sont notées à côté de chaque règle
 * pour qu'une personne les relise avant de passer `verified` à `true`.
 *
 * Champ d'application de l'arrêté du 24 janvier 2017 (en vigueur depuis le
 * 1er avril 2017, il remplace l'arrêté du 2 mars 1990 et supprime le seuil de
 * 150 € : un devis est dû dès le premier euro) : dépannage, réparation et
 * entretien dans le bâtiment et l'équipement de la maison.
 * https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000033959893
 * Déménagement : arrêté du 27 avril 2010, art. 1.
 * https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000022192199
 * Garages : arrêté du 27 mars 1987 (non lu : aucune référence donnée).
 * Tous professionnels : Code de la consommation, art. R111-1.
 * https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000045987238
 *
 * TODO: vérifier — chaque règle ci-dessous (texte, champ d'application par
 * corps de métier, référence) avant de passer `verified` à `true`.
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
  /** Texte qui exige la mention, par corps de métier. */
  readonly legalRefs: Partial<Record<Category, string>>;
  /** Texte valable pour tous les corps de métier sans référence propre. */
  readonly fallbackLegalRef?: string;
  readonly verified: boolean;
}

/** Dépannage, réparation et entretien au domicile : arrêté du 24 janvier 2017. */
const HOME_REPAIR: readonly Category[] = ["plomberie", "electricite", "chauffage", "serrurerie", "travaux"];

/** Corps de métier du bâtiment, où l'assurance décennale est en jeu. */
const BUILDING_TRADES: readonly Category[] = ["travaux", "plomberie", "electricite", "chauffage"];

const ARRETE_2017 = "Arrêté du 24 janvier 2017, art. 4";
const ARRETE_2010 = "Arrêté du 27 avril 2010, art. 1";

function refs(categories: readonly Category[], ref: string): Partial<Record<Category, string>> {
  return Object.fromEntries(categories.map((category) => [category, ref]));
}

/** Référence d'une règle pour un corps de métier, ou `undefined` si aucun texte connu ne la fonde. */
export function legalRefFor(rule: MentionRule, category: Category): string | undefined {
  return rule.legalRefs[category] ?? rule.fallbackLegalRef;
}

export const MENTION_RULES: readonly MentionRule[] = [
  {
    // R111-1 1° : nom ou dénomination, adresse, téléphone, email.
    id: "mention-company-name",
    field: "hasCompanyName",
    categories: "all",
    severity: "error",
    note: "Qui a fait ce devis ?",
    message: "Le nom de l'entreprise n'apparaît pas sur le devis. Il y figure en principe obligatoirement.",
    legalRefs: { ...refs(HOME_REPAIR, ARRETE_2017), demenagement: ARRETE_2010 },
    fallbackLegalRef: "Code de la consommation, art. R111-1",
    verified: false,
  },
  {
    // R111-1 1° : « adresse géographique de son établissement ».
    id: "mention-address",
    field: "hasAddress",
    categories: "all",
    severity: "error",
    note: "Adresse de l'entreprise absente",
    message: "L'adresse de l'entreprise n'apparaît pas sur le devis. Elle y figure en principe obligatoirement.",
    legalRefs: { ...refs(HOME_REPAIR, ARRETE_2017), demenagement: ARRETE_2010 },
    fallbackLegalRef: "Code de la consommation, art. R111-1",
    verified: false,
  },
  {
    // Aucun texte lu n'exige le SIRET sur un devis de bâtiment (il n'est pas
    // dans l'article 4 de l'arrêté de 2017) : R123-237 vise les documents
    // commerciaux des entreprises inscrites au RCS, R111-2 le numéro
    // « communiqué ou mis à disposition ». D'où un point d'attention, pas une
    // erreur, et plus de verdict « À vérifier sérieusement » pour lui seul.
    // https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000045710304
    // https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000029471787
    id: "mention-siret",
    field: "hasSiret",
    categories: "all",
    severity: "warning",
    note: "Pas de SIRET",
    message:
      "Aucun numéro SIRET ou SIREN n'apparaît sur le devis. Une entreprise inscrite au registre du commerce l'indique en principe sur ses documents commerciaux, et tout prestataire doit pouvoir vous le communiquer : demandez-le, puis vérifiez-le sur l'annuaire des entreprises.",
    legalRefs: {},
    fallbackLegalRef: "Code de commerce, art. R123-237 ; Code de la consommation, art. R111-2",
    verified: false,
  },
  {
    id: "mention-date",
    field: "quoteDate",
    categories: "all",
    severity: "warning",
    note: "Devis non daté",
    message:
      "Le devis n'est pas daté. Sans date, vous ne pouvez pas savoir jusqu'à quand il est valable : demandez qu'il soit daté.",
    legalRefs: { ...refs(HOME_REPAIR, ARRETE_2017), demenagement: ARRETE_2010 },
    verified: false,
  },
  {
    // Code civil, art. 1117 : sans délai fixé, l'offre ne vaut qu'un délai raisonnable.
    // https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000036829821
    id: "mention-validity",
    field: "hasValidityDate",
    categories: "all",
    severity: "warning",
    note: "Valable jusqu'à quand ?",
    message:
      "Le devis n'indique pas sa durée de validité. Sans durée indiquée, l'offre ne vaut qu'un « délai raisonnable » : demandez jusqu'à quand les prix sont garantis.",
    legalRefs: refs(HOME_REPAIR, ARRETE_2017),
    fallbackLegalRef: "Code civil, art. 1116 et 1117",
    verified: false,
  },
  {
    id: "mention-client",
    field: "hasClientIdentity",
    categories: "all",
    severity: "warning",
    note: "Pour qui, et où ?",
    message:
      "Le devis ne dit ni à qui il s'adresse ni où ont lieu les travaux. Demandez qu'il soit complété.",
    legalRefs: { ...refs(HOME_REPAIR, ARRETE_2017), demenagement: ARRETE_2010 },
    verified: false,
  },
  {
    // L132-1 du Code de l'artisanat (depuis le 1er juillet 2023) : assurance,
    // assureur et couverture géographique sur chaque devis ; L243-2 du Code
    // des assurances : attestations jointes aux devis et factures.
    // https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000047362294
    // https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000031010272
    id: "mention-insurance",
    field: "hasInsuranceMention",
    categories: BUILDING_TRADES,
    severity: "warning",
    note: "Assurance décennale ?",
    message:
      "Le devis ne mentionne pas d'assurance professionnelle. Un artisan du bâtiment soumis à l'assurance décennale l'indique en principe sur chaque devis, avec les coordonnées de son assureur et la zone couverte : demandez-lui son attestation d'assurance.",
    legalRefs: {},
    fallbackLegalRef: "Code de l'artisanat, art. L132-1 ; Code des assurances, art. L243-2",
    verified: false,
  },
];

/** Taux de TVA en vigueur en France métropolitaine (hors Corse), en pourcentage (0 : franchise en base). */
export const VAT_RATES_IN_FORCE: readonly number[] = [20, 10, 5.5, 2.1, 0];

/**
 * Taux de TVA en vigueur selon le territoire du chantier.
 * - Guadeloupe, Martinique, La Réunion : taux propres (CGI, art. 296).
 *   https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000028419532
 * - Guyane et Mayotte : TVA non applicable.
 * - Corse : taux particuliers en plus des taux de droit commun (CGI, art. 297).
 *   https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000048827176
 * TODO: vérifier — taux applicables aux travaux dans les DOM et en Corse.
 */
export const VAT_TERRITORIES = [
  { departments: ["971", "972", "974"], name: "en Guadeloupe, en Martinique et à La Réunion", rates: [8.5, 2.1, 1.75, 1.05, 0] },
  { departments: ["973", "976"], name: "en Guyane et à Mayotte", rates: [0] },
  { departments: ["2A", "2B", "20"], name: "en Corse", rates: [20, 13, 10, 5.5, 2.1, 0.9, 0] },
] as const;

export interface VatTerritory {
  readonly rates: readonly number[];
  /** « en France métropolitaine », « en Corse »… */
  readonly where: string;
  /** Faux tant que les taux du territoire n'ont pas été relus (voir le TODO ci-dessus). */
  readonly verified: boolean;
  /**
   * Vrai si les taux habituels par métier (`USUAL_VAT_RATES`, décrits pour la
   * métropole) s'appliquent : en métropole, ou si le département n'a pas été lu.
   */
  readonly usualRatesApply: boolean;
}

/** Tous les taux en vigueur en France, territoires compris, du plus haut au plus bas. */
const ALL_FRENCH_RATES: readonly number[] = [
  ...new Set([...VAT_RATES_IN_FORCE, ...VAT_TERRITORIES.flatMap((territory) => territory.rates)]),
].sort((a, b) => b - a);

/**
 * Taux en vigueur pour un département. Département non lu : on ne sait pas
 * où ont lieu les travaux, donc tout taux en vigueur quelque part en France
 * est accepté (un devis de La Réunion à 8,5 % n'est pas une erreur).
 */
export function vatRatesFor(department: string | undefined): VatTerritory {
  if (department === undefined) {
    return { rates: ALL_FRENCH_RATES, where: "en France", verified: false, usualRatesApply: true };
  }
  const territory = VAT_TERRITORIES.find((item) => (item.departments as readonly string[]).includes(department));
  return territory
    ? { rates: territory.rates, where: territory.name, verified: false, usualRatesApply: false }
    : { rates: VAT_RATES_IN_FORCE, where: "en France métropolitaine", verified: true, usualRatesApply: true };
}

/**
 * Taux habituels par corps de métier. Les taux réduits (10 %, 5,5 %)
 * concernent des travaux dans un logement de plus de deux ans, sous
 * conditions ; un garage ou un déménageur facture au taux normal.
 * - 10 % : logement achevé depuis plus de deux ans (CGI, art. 279-0 bis) ;
 *   travaux d'urgence (fuite, effraction, perte de clés) à 10 % quel que
 *   soit l'âge du logement.
 * - 5,5 % : rénovation énergétique (CGI, art. 278-0 bis A).
 * - Depuis le 1er mars 2025, fourniture et pose d'une chaudière au gaz ou au
 *   fioul au taux normal de 20 % (loi n° 2025-127, art. 32).
 * - L'attestation 1300-SD / 1301-SD est remplacée par une simple mention sur
 *   le devis ou la facture (loi n° 2025-127, art. 41).
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
 * délai de rétractation de 14 jours (L221-18), aucun paiement avant 7 jours
 * (L221-10), sauf réparations urgentes demandées par le consommateur
 * (L221-28 et L221-10).
 * https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032226842
 * https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032226864
 * https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000044563170
 *
 * TODO: vérifier — numérotation après l'ordonnance n° 2026-2 (en vigueur le
 * 19 juin 2026), point de départ du délai pour un contrat « fourniture et pose ».
 */
export const DOOR_TO_DOOR_RULE = {
  withdrawalDays: 14,
  noPaymentDays: 7,
  legalRef: "Code de la consommation, art. L221-18, L221-10 et L221-28",
  paymentLegalRef: "Code de la consommation, art. L221-10",
  verified: false,
} as const;
