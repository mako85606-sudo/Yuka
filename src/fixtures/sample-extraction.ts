import type { Extraction } from "@/lib/extraction/schema";

/**
 * Extraction fictive et valide, pour les tests : un devis de plomberie lu
 * proprement, avec une ligne vague sans quantité ni prix unitaire.
 */
export const sampleExtraction: Extraction = {
  documentKind: "devis",
  category: "plomberie",
  readability: "good",
  subject: "Remplacement d'un chauffe-eau électrique",
  issuer: {
    hasCompanyName: true,
    hasSiret: true,
    hasAddress: true,
    hasInsuranceMention: false,
    hasValidityDate: true,
    hasTravelFees: true,
    hasClientIdentity: true,
    hasPaymentTerms: false,
  },
  meta: {
    isDoorToDoorSale: false,
    quoteDate: "2026-09-12",
    validityDays: 30,
    depositPercent: 30,
    department: "69",
  },
  lines: [
    {
      label: "Chauffe-eau électrique 200 L",
      confidence: "high",
      quantity: 1,
      unit: "unite",
      unitPriceHT: 890,
      totalHT: 890,
      vatRate: 10,
      canonicalItem: "plomberie.chauffe-eau.fourniture.200l",
    },
    { label: "Forfait divers", confidence: "medium", totalHT: 120, vatRate: 10 },
  ],
  totals: { totalHT: 1010, totalVAT: 101, totalTTC: 1111 },
  confidence: {
    category: "high",
    issuer: "high",
    quoteDate: "high",
    validity: "high",
    deposit: "medium",
    executionDelay: "high",
    department: "high",
    doorToDoorSale: "high",
    totals: "high",
  },
};
