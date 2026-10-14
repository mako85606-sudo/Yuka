import { z } from "zod";
import { CATEGORIES, QUOTE_UNITS, TAXONOMY_IDS } from "@/config/taxonomy";

/**
 * Ce que le modèle lit sur un devis : la seule source de vérité de la forme
 * de l'extraction. L'`input_schema` de l'outil en est dérivé
 * (`toStrictToolSchema`), et la même définition valide la réponse côté serveur.
 *
 * Choix de forme :
 * - Aucune valeur personnelle : l'émetteur et les mentions ne sont que des
 *   booléens de présence, le lieu se réduit au département.
 * - Une valeur absente ou illisible est omise (champ optionnel), jamais
 *   devinée. Pas de `null` : les unions coûtent cher aux schémas stricts.
 * - Les champs obligatoires sortent dans l'ordre déclaré, avant les
 *   optionnels : nature du document, catégorie et lisibilité arrivent en
 *   premier, ce qui permet d'arrêter tôt (devis de santé, document illisible).
 * - Les montants sont recopiés tels qu'imprimés, même faux : les calculs sont
 *   vérifiés ensuite en TypeScript, jamais par le modèle.
 */

export const CONFIDENCE_LEVELS = ["high", "medium", "low"] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

export const DOCUMENT_KINDS = ["devis", "facture", "autre"] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export const READABILITY_LEVELS = ["good", "partial", "poor"] as const;
export type Readability = (typeof READABILITY_LEVELS)[number];

const confidence = z.enum(CONFIDENCE_LEVELS);

const presence = (what: string) => z.boolean().describe(`Vrai si ${what} figure sur le document.`);

export const extractedLineSchema = z.object({
  label: z
    .string()
    .describe(
      "Désignation de la ligne : la description technique seulement, sans nom, adresse, téléphone ni numéro identifiant.",
    ),
  confidence: confidence.describe("Confiance dans la lecture de cette ligne, montants compris."),
  quantity: z.number().optional().describe("Quantité imprimée."),
  unit: z
    .enum(QUOTE_UNITS)
    .optional()
    .describe(
      "Unité : unite (u, pce, ens.), heure, jour, mois, m2, m3, ml (mètre linéaire), kg, litre, km, forfait, lot.",
    ),
  unitPriceHT: z.number().optional().describe("Prix unitaire HT imprimé, en euros."),
  totalHT: z
    .number()
    .optional()
    .describe("Montant HT de la ligne tel qu'imprimé, en euros (négatif pour une remise)."),
  vatRate: z
    .number()
    .optional()
    .describe("Taux de TVA de la ligne, en pourcentage : 20, 10, 5.5, 2.1 ou 0."),
  canonicalItem: z
    .enum(TAXONOMY_IDS)
    .optional()
    .describe("Prestation de la liste qui correspond à cette ligne, si elle existe."),
});

export type ExtractedLine = z.infer<typeof extractedLineSchema>;

export const extractionSchema = z.object({
  documentKind: z
    .enum(DOCUMENT_KINDS)
    .describe("devis, facture, ou autre si le document n'est ni l'un ni l'autre."),
  category: z.enum(CATEGORIES).describe("Corps de métier du devis."),
  readability: z
    .enum(READABILITY_LEVELS)
    .describe(
      "good : tout se lit. partial : certaines zones sont floues, coupées ou masquées. poor : l'essentiel est illisible.",
    ),
  subject: z
    .string()
    .describe(
      "Objet du devis en quelques mots (« Remplacement d'un chauffe-eau »), sans nom, adresse ni numéro.",
    ),
  issuer: z
    .object({
      hasCompanyName: presence("le nom ou la raison sociale de l'entreprise"),
      hasSiret: presence("un numéro SIRET ou SIREN"),
      hasAddress: presence("l'adresse de l'entreprise"),
      hasInsuranceMention: presence(
        "une mention d'assurance professionnelle (décennale ou responsabilité civile)",
      ),
      hasValidityDate: presence("une date ou une durée de validité de l'offre"),
      hasTravelFees: presence("des frais de déplacement (ligne ou mention)"),
      hasClientIdentity: presence("l'identité du client ou le lieu d'intervention"),
      hasPaymentTerms: presence("des conditions de paiement"),
    })
    .describe("Mentions présentes sur le document : des booléens uniquement, jamais les valeurs."),
  meta: z.object({
    isDoorToDoorSale: z
      .boolean()
      .describe(
        "Vrai seulement si le document indique un contrat conclu hors établissement : démarchage, signature au domicile, formulaire de rétractation.",
      ),
    quoteDate: z.iso.date().optional().describe("Date du devis."),
    validityDays: z.number().int().optional().describe("Durée de validité, en jours."),
    validUntil: z.iso.date().optional().describe("Date de fin de validité, si elle est imprimée."),
    depositPercent: z
      .number()
      .optional()
      .describe("Acompte demandé, en pourcentage, s'il est exprimé ainsi."),
    depositAmount: z
      .number()
      .optional()
      .describe("Acompte demandé, en euros, s'il est exprimé ainsi."),
    executionDelayDays: z
      .number()
      .int()
      .optional()
      .describe("Délai d'exécution ou de début des travaux, en jours (« 2 semaines » : 14)."),
    department: z
      .string()
      .optional()
      .describe(
        "Deux premiers chiffres du code postal du lieu d'intervention (trois pour l'outre-mer).",
      ),
  }),
  lines: z.array(extractedLineSchema).describe("Lignes du devis, dans l'ordre, sous-totaux exclus."),
  totals: z.object({
    totalHT: z.number().optional().describe("Total HT imprimé."),
    totalVAT: z.number().optional().describe("Montant total de TVA imprimé."),
    totalTTC: z.number().optional().describe("Total TTC imprimé."),
  }),
  confidence: z
    .object({
      category: confidence,
      issuer: confidence,
      quoteDate: confidence,
      validity: confidence,
      deposit: confidence,
      executionDelay: confidence,
      department: confidence,
      doorToDoorSale: confidence,
      totals: confidence,
    })
    .describe(
      "Confiance par champ : high si la valeur est nette (ou nettement absente), medium si tu as dû interpréter, low si tu devines presque.",
    ),
});

export type Extraction = z.infer<typeof extractionSchema>;
export type ExtractionIssuer = Extraction["issuer"];
export type ExtractionMeta = Extraction["meta"];
export type ExtractionTotals = Extraction["totals"];
export type ExtractionConfidence = Extraction["confidence"];

/** Champs à valeurs énumérées : leur casse est normalisée avant validation. */
const ENUM_FIELDS = new Set([
  "documentKind",
  "category",
  "readability",
  "unit",
  "canonicalItem",
  "confidence",
]);

/**
 * Prépare la réponse brute du modèle avant validation : retire les `null`
 * (une valeur absente s'omet) et met en minuscules les valeurs énumérées (les
 * sorties structurées ne garantissent pas la casse). Ne corrige aucun nombre.
 */
export function prepareRawExtraction(value: unknown, key?: string, parentKey?: string): unknown {
  if (Array.isArray(value)) return value.map((item) => prepareRawExtraction(item, undefined, key));
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== null && item !== undefined)
      .map(([childKey, item]) => [childKey, prepareRawExtraction(item, childKey, key)] as const);
    return Object.fromEntries(entries);
  }
  const isEnum = (key !== undefined && ENUM_FIELDS.has(key)) || parentKey === "confidence";
  if (typeof value === "string" && isEnum) return value.trim().toLowerCase();
  return value;
}

/** Message d'erreur de validation lisible par le modèle, pour la relance. */
export function describeValidationError(error: z.ZodError): string {
  return error.issues
    .slice(0, 12)
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "(racine)";
      return `- ${path} : ${issue.message}`;
    })
    .join("\n");
}
