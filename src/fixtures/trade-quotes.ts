import type { DemoQuote } from "@/lib/demo-outcome";
import { totalsFromLines, type SceneLine } from "@/lib/scene-quote";
import { fr } from "@/lib/typography";

/**
 * Devis fictifs du carrousel « un devis, quel que soit le métier » : courts
 * (trois lignes), un problème ou un avis de prix chacun, un verdict de chaque
 * couleur. Comme `demo-quotes.ts`, tout est inventé, présenté comme exemple
 * fictif, et gardé honnête par `demo-quotes.test.ts` (erreurs réelles dans
 * les chiffres, verdict conforme aux règles de l'analyse).
 */

const CORRECTED_AT = new Date("2026-10-03T09:00:00Z");

const garageLines: readonly SceneLine[] = [
  { id: "l1", label: "Disques avant (la paire)", quantity: 1, unit: "u", unitPriceHT: 96, totalHT: 96 },
  { id: "l2", label: "Plaquettes avant", quantity: 1, unit: "u", unitPriceHT: 48, totalHT: 48 },
  { id: "l3", label: "Main-d'œuvre", quantity: 1.5, unit: "h", unitPriceHT: 70, totalHT: 140 },
];

const plumbingLines: readonly SceneLine[] = [
  { id: "l1", label: "Recherche de fuite", quantity: 1, unit: "u", unitPriceHT: 180, totalHT: 180 },
  { id: "l2", label: "Forfait intervention", quantity: 1, unit: "u", unitPriceHT: 90, totalHT: 90 },
  { id: "l3", label: "Joint et raccord", quantity: 1, unit: "u", unitPriceHT: 24, totalHT: 24 },
];

const electricLines: readonly SceneLine[] = [
  { id: "l1", label: "Prises 16 A", quantity: 4, unit: "u", unitPriceHT: 14, totalHT: 56 },
  { id: "l2", label: "Câble et gaine", quantity: 12, unit: "m", unitPriceHT: 3.5, totalHT: 42 },
  { id: "l3", label: "Main-d'œuvre", quantity: 3, unit: "h", unitPriceHT: 55, totalHT: 165 },
];

const locksmithLines: readonly SceneLine[] = [
  { id: "l1", label: "Ouverture de porte claquée", quantity: 1, unit: "u", unitPriceHT: 390, totalHT: 390 },
  { id: "l2", label: "Déplacement", quantity: 1, unit: "u", unitPriceHT: 60, totalHT: 60 },
  { id: "l3", label: "Majoration de soirée", quantity: 1, unit: "u", unitPriceHT: 80, totalHT: 80 },
];

const heatingLines: readonly SceneLine[] = [
  { id: "l1", label: "Entretien annuel", quantity: 1, unit: "u", unitPriceHT: 120, totalHT: 120 },
  { id: "l2", label: "Pièces diverses", quantity: 1, unit: "u", unitPriceHT: 35, totalHT: 35 },
  { id: "l3", label: "Déplacement", quantity: 1, unit: "u", unitPriceHT: 25, totalHT: 25 },
];

const movingLines: readonly SceneLine[] = [
  { id: "l1", label: "Équipe de 3, une journée", quantity: 1, unit: "u", unitPriceHT: 690, totalHT: 690 },
  { id: "l2", label: "Cartons", quantity: 40, unit: "u", unitPriceHT: 2.5, totalHT: 115 },
  { id: "l3", label: "Assurance du mobilier", quantity: 1, unit: "u", unitPriceHT: 45, totalHT: 45 },
];

export const tradeQuotes: readonly DemoQuote[] = [
  {
    id: "carte-garage",
    category: "Garage",
    department: "Loire (42)",
    title: "Plaquettes et disques avant",
    issuedAt: new Date("2026-09-15T08:00:00Z"),
    validityDays: 15,
    vatRate: 0.2,
    lines: garageLines,
    totals: totalsFromLines(garageLines, 0.2),
    issues: [
      {
        id: "carte-garage-calcul",
        kind: "calculation",
        lineId: "l3",
        note: fr("1,5 h × 70 € = 105 €, pas 140"),
        detail: fr("Erreur de calcul : 1,5 heure à 70,00 € fait 105,00 €, le devis indique 140,00 €."),
      },
    ],
    prices: [{ lineId: "l1", delta: 8, source: { kind: "loupe", comparables: 21 } }],
    verdict: "alert",
    correctedAt: CORRECTED_AT,
    message: fr(
      "Bonjour, sur votre devis, la main-d'œuvre compte 140 € pour 1,5 heure à 70 €. Pourriez-vous vérifier cette ligne ?",
    ),
  },
  {
    id: "carte-plomberie",
    category: "Plomberie",
    department: "Hérault (34)",
    title: "Recherche de fuite",
    issuedAt: new Date("2026-09-18T08:00:00Z"),
    validityDays: 30,
    vatRate: 0.1,
    lines: plumbingLines,
    totals: totalsFromLines(plumbingLines, 0.1),
    issues: [
      {
        id: "carte-plomberie-vague",
        kind: "vague-line",
        lineId: "l2",
        note: fr("Intervention : laquelle ?"),
        detail: fr("Ligne vague : « Forfait intervention » ne précise pas ce qui est facturé."),
      },
    ],
    prices: [{ lineId: "l1", delta: 45, source: { kind: "loupe", comparables: 14 } }],
    verdict: "negotiate",
    correctedAt: CORRECTED_AT,
  },
  {
    id: "carte-serrurerie",
    category: "Serrurerie",
    department: "Paris (75)",
    title: "Ouverture de porte claquée",
    issuedAt: new Date("2026-09-20T08:00:00Z"),
    validityDays: 1,
    vatRate: 0.2,
    lines: locksmithLines,
    totals: totalsFromLines(locksmithLines, 0.2),
    issues: [],
    prices: [{ lineId: "l1", delta: 240, source: { kind: "loupe", comparables: 31 } }],
    verdict: "alert",
    correctedAt: CORRECTED_AT,
  },
  {
    id: "carte-electricite",
    category: "Électricité",
    department: "Bas-Rhin (67)",
    title: "Ajout de quatre prises",
    issuedAt: new Date("2026-09-21T08:00:00Z"),
    validityDays: 30,
    vatRate: 0.1,
    lines: electricLines,
    totals: totalsFromLines(electricLines, 0.1),
    issues: [],
    prices: [{ lineId: "l3", delta: -12, source: { kind: "loupe", comparables: 19 } }],
    verdict: "ok",
    correctedAt: CORRECTED_AT,
  },
  {
    id: "carte-chauffage",
    category: "Chauffage",
    department: "Isère (38)",
    title: "Entretien de chaudière gaz",
    issuedAt: new Date("2026-09-24T08:00:00Z"),
    validityDays: 30,
    vatRate: 0.1,
    lines: heatingLines,
    totals: totalsFromLines(heatingLines, 0.1),
    issues: [
      {
        id: "carte-chauffage-vague",
        kind: "vague-line",
        lineId: "l2",
        note: fr("Quelles pièces ?"),
        detail: fr("Ligne vague : « Pièces diverses » ne précise pas ce qui est facturé."),
      },
    ],
    prices: [{ lineId: "l1", delta: 20, source: { kind: "ai" } }],
    verdict: "negotiate",
    correctedAt: CORRECTED_AT,
  },
  {
    id: "carte-demenagement",
    category: "Déménagement",
    department: "Loire-Atlantique (44)",
    title: "Déménagement d'un deux-pièces",
    issuedAt: new Date("2026-09-26T08:00:00Z"),
    validityDays: 30,
    vatRate: 0.2,
    lines: movingLines,
    totals: totalsFromLines(movingLines, 0.2),
    issues: [
      {
        id: "carte-demenagement-calcul",
        kind: "calculation",
        lineId: "l2",
        note: "40 × 2,5 = 100, pas 115",
        detail: fr("Erreur de calcul : 40 cartons à 2,50 € font 100,00 €, le devis indique 115,00 €."),
      },
    ],
    prices: [],
    verdict: "negotiate",
    correctedAt: CORRECTED_AT,
  },
];
