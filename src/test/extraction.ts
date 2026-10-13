import type { ExtractedLine, Extraction } from "@/lib/extraction/schema";

/**
 * Une lecture irréprochable (calculs justes, toutes les mentions), à
 * modifier champ par champ dans les tests des vérifications.
 */
export const cleanExtraction: Extraction = {
  documentKind: "devis",
  category: "plomberie",
  readability: "good",
  subject: "Remplacement d'un chauffe-eau",
  issuer: {
    hasCompanyName: true,
    hasSiret: true,
    hasAddress: true,
    hasInsuranceMention: true,
    hasValidityDate: true,
    hasTravelFees: true,
    hasClientIdentity: true,
    hasPaymentTerms: true,
  },
  meta: {
    isDoorToDoorSale: false,
    quoteDate: "2026-09-14",
    validityDays: 30,
    department: "69",
  },
  lines: [
    {
      label: "Chauffe-eau électrique 200 L",
      confidence: "high",
      quantity: 1,
      unit: "unite",
      unitPriceHT: 689,
      totalHT: 689,
      vatRate: 10,
      canonicalItem: "plomberie.chauffe-eau.fourniture.200l",
    },
    {
      label: "Main-d'œuvre",
      confidence: "high",
      quantity: 3,
      unit: "heure",
      unitPriceHT: 58,
      totalHT: 174,
      vatRate: 10,
      canonicalItem: "plomberie.main-oeuvre",
    },
    {
      label: "Déplacement",
      confidence: "high",
      quantity: 1,
      unit: "forfait",
      unitPriceHT: 30,
      totalHT: 30,
      vatRate: 10,
      canonicalItem: "plomberie.deplacement",
    },
  ],
  totals: { totalHT: 893, totalVAT: 89.3, totalTTC: 982.3 },
  confidence: {
    category: "high",
    issuer: "high",
    quoteDate: "high",
    validity: "high",
    deposit: "high",
    executionDelay: "high",
    department: "high",
    doorToDoorSale: "high",
    totals: "high",
  },
};

type ExtractionChanges = {
  readonly [K in keyof Extraction]?: Extraction[K] extends readonly unknown[] | string | boolean
    ? Extraction[K]
    : Partial<Extraction[K]>;
};

/** La lecture propre, avec quelques champs changés (les objets sont fusionnés). */
export function extractionWith(changes: ExtractionChanges): Extraction {
  return {
    ...cleanExtraction,
    ...changes,
    issuer: { ...cleanExtraction.issuer, ...changes.issuer },
    meta: { ...cleanExtraction.meta, ...changes.meta },
    totals: { ...cleanExtraction.totals, ...changes.totals },
    confidence: { ...cleanExtraction.confidence, ...changes.confidence },
    lines: changes.lines ?? cleanExtraction.lines,
  } as Extraction;
}

/** Remplace une ligne de la lecture propre. */
export function withLine(index: number, change: Partial<ExtractedLine>): Extraction {
  return extractionWith({
    lines: cleanExtraction.lines.map((line, position) => (position === index ? { ...line, ...change } : line)),
  });
}
