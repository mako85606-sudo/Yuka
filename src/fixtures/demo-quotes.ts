import { totalsFromLines, type SceneLine, type SceneQuote } from "@/lib/scene-quote";
import { fr } from "@/lib/typography";

/**
 * Devis fictifs des démos (landing, planche de style).
 *
 * Tout est inventé : ce ne sont ni de vrais devis ni des prix de référence.
 * Les écarts de prix et les nombres de « devis comparables » servent
 * uniquement à montrer le rendu, et la landing les présente comme un
 * exemple fictif. Les erreurs sont volontaires et vérifiées par
 * `demo-quotes.test.ts` : chaque erreur de calcul annoncée existe vraiment
 * dans les chiffres, et aucune autre ligne n'est fausse.
 */

const plumbingLines: readonly SceneLine[] = [
  { id: "l1", label: "Chauffe-eau 200 L, vertical", quantity: 1, unit: "u", unitPriceHT: 890, totalHT: 890 },
  { id: "l2", label: "Main-d'œuvre, pose", quantity: 4, unit: "h", unitPriceHT: 65, totalHT: 280 },
  { id: "l3", label: "Groupe de sécurité", quantity: 1, unit: "u", unitPriceHT: 58, totalHT: 58 },
  { id: "l4", label: "Forfait divers", quantity: 1, unit: "u", unitPriceHT: 120, totalHT: 120 },
  { id: "l5", label: "Déplacement", quantity: 1, unit: "u", unitPriceHT: 45, totalHT: 45 },
];

/** Plomberie : une erreur de calcul, une ligne vague, un prix haut. À négocier. */
export const plumbingQuote: SceneQuote = {
  id: "demo-plomberie",
  category: "Plomberie",
  department: "Rhône (69)",
  title: "Remplacement d'un chauffe-eau électrique",
  issuedAt: new Date("2026-09-12T08:00:00Z"),
  validityDays: 30,
  vatRate: 0.1,
  lines: plumbingLines,
  totals: totalsFromLines(plumbingLines, 0.1),
  issues: [
    {
      id: "calcul-l2",
      kind: "calculation",
      lineId: "l2",
      note: "4 × 65 = 260, pas 280",
      detail: fr("Erreur de calcul : 4 heures à 65,00 € font 260,00 €, le devis indique 280,00 €."),
    },
    {
      id: "vague-l4",
      kind: "vague-line",
      lineId: "l4",
      note: fr("Un forfait pour quoi ?"),
      detail: fr("Ligne vague : « Forfait divers » ne précise pas ce qui est facturé."),
    },
  ],
  prices: [
    { lineId: "l1", delta: 340, source: { kind: "loupe", comparables: 23 } },
    { lineId: "l3", delta: 12, source: { kind: "ai" } },
  ],
  verdict: "negotiate",
  correctedAt: new Date("2026-10-03T09:00:00Z"),
};

const garageLines: readonly SceneLine[] = [
  { id: "l1", label: "Kit d'embrayage complet", quantity: 1, unit: "u", unitPriceHT: 389, totalHT: 389 },
  { id: "l2", label: "Volant moteur bimasse", quantity: 1, unit: "u", unitPriceHT: 610, totalHT: 610 },
  { id: "l3", label: "Main-d'œuvre", quantity: 5, unit: "h", unitPriceHT: 72, totalHT: 360 },
  { id: "l4", label: "Liquide d'embrayage", quantity: 1, unit: "L", unitPriceHT: 18, totalHT: 36 },
  { id: "l5", label: "Petites fournitures", quantity: 1, unit: "u", unitPriceHT: 45, totalHT: 45 },
];

/** Garage : une erreur de calcul, une ligne vague, deux prix hauts. À vérifier sérieusement. */
export const garageQuote: SceneQuote = {
  id: "demo-garage",
  category: "Garage",
  department: "Gironde (33)",
  title: "Remplacement de l'embrayage",
  issuedAt: new Date("2026-09-02T08:00:00Z"),
  validityDays: 15,
  vatRate: 0.2,
  lines: garageLines,
  totals: totalsFromLines(garageLines, 0.2),
  issues: [
    {
      id: "calcul-l4",
      kind: "calculation",
      lineId: "l4",
      note: "1 × 18 = 18, pas 36",
      detail: fr("Erreur de calcul : 1 litre à 18,00 € fait 18,00 €, le devis indique 36,00 €."),
    },
    {
      id: "vague-l5",
      kind: "vague-line",
      lineId: "l5",
      note: fr("Fournitures : lesquelles ?"),
      detail: fr("Ligne vague : « Petites fournitures » ne précise pas ce qui est facturé."),
    },
  ],
  prices: [
    { lineId: "l1", delta: 145, source: { kind: "loupe", comparables: 17 } },
    { lineId: "l2", delta: 180, source: { kind: "ai" } },
  ],
  verdict: "alert",
  correctedAt: new Date("2026-10-03T09:00:00Z"),
};

const electricLines: readonly SceneLine[] = [
  { id: "l1", label: "Tableau 3 rangées équipé", quantity: 1, unit: "u", unitPriceHT: 420, totalHT: 420 },
  { id: "l2", label: "Différentiel 30 mA", quantity: 2, unit: "u", unitPriceHT: 62, totalHT: 124 },
  { id: "l3", label: "Main-d'œuvre", quantity: 6, unit: "h", unitPriceHT: 55, totalHT: 330 },
  { id: "l4", label: "Déplacement", quantity: 1, unit: "u", unitPriceHT: 30, totalHT: 30 },
];

/** Électricité : rien à redire, prix dans la moyenne. Correct. */
export const electricQuote: SceneQuote = {
  id: "demo-electricite",
  category: "Électricité",
  department: "Nord (59)",
  title: "Remplacement du tableau électrique",
  issuedAt: new Date("2026-09-22T08:00:00Z"),
  validityDays: 30,
  vatRate: 0.1,
  lines: electricLines,
  totals: totalsFromLines(electricLines, 0.1),
  issues: [],
  prices: [
    { lineId: "l1", delta: -35, source: { kind: "loupe", comparables: 12 } },
    { lineId: "l2", delta: 4, source: { kind: "ai" } },
  ],
  verdict: "ok",
  correctedAt: new Date("2026-10-03T09:00:00Z"),
};

/** Ordre de la boucle de la landing : un verdict de chaque couleur. */
export const demoQuotes: readonly SceneQuote[] = [plumbingQuote, garageQuote, electricQuote];
