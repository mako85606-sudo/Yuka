import type { PriceSource } from "@/lib/price-wording";

/**
 * Devis fictif de démonstration (planche de style, puis démo de la landing).
 *
 * Toutes les données sont inventées : ce ne sont ni des prix de référence ni
 * un vrai devis. Les écarts de prix et le nombre de « devis comparables »
 * servent uniquement à montrer le rendu. Les erreurs sont volontaires :
 * - ligne « Main-d'œuvre » : 4 h × 65,00 = 260,00, le devis affiche 280,00 ;
 * - ligne « Forfait divers » : aucune précision sur ce qu'elle couvre.
 */

export interface DemoLine {
  readonly id: string;
  readonly label: string;
  readonly quantity: number;
  readonly unit: string;
  readonly unitPriceHT: number;
  readonly totalHT: number;
}

export interface DemoIssue {
  readonly id: string;
  readonly lineId: string;
  /** Note manuscrite, courte. */
  readonly note: string;
  /** Explication complète, pour les lecteurs d'écran. */
  readonly detail: string;
}

export interface DemoPrice {
  readonly lineId: string;
  readonly delta: number;
  readonly source: PriceSource;
}

export interface DemoQuote {
  readonly id: string;
  readonly category: string;
  readonly department: string;
  readonly title: string;
  readonly issuedAt: Date;
  readonly validityDays: number;
  readonly vatRate: number;
  readonly lines: readonly DemoLine[];
  readonly issues: readonly DemoIssue[];
  readonly prices: readonly DemoPrice[];
  readonly verdict: "ok" | "negotiate" | "alert";
  readonly correctedAt: Date;
}

export const demoQuote: DemoQuote = {
  id: "demo-chauffe-eau",
  category: "Plomberie",
  department: "Rhône (69)",
  title: "Remplacement d'un chauffe-eau électrique",
  issuedAt: new Date("2026-09-12T08:00:00Z"),
  validityDays: 30,
  vatRate: 0.1,
  lines: [
    {
      id: "l1",
      label: "Chauffe-eau électrique 200 L, vertical",
      quantity: 1,
      unit: "u",
      unitPriceHT: 890,
      totalHT: 890,
    },
    {
      id: "l2",
      label: "Dépose et évacuation de l'ancien ballon",
      quantity: 1,
      unit: "forfait",
      unitPriceHT: 90,
      totalHT: 90,
    },
    {
      id: "l3",
      label: "Main-d'œuvre, pose et raccordement",
      quantity: 4,
      unit: "h",
      unitPriceHT: 65,
      totalHT: 280,
    },
    {
      id: "l4",
      label: "Groupe de sécurité et raccords",
      quantity: 1,
      unit: "u",
      unitPriceHT: 58,
      totalHT: 58,
    },
    {
      id: "l5",
      label: "Forfait divers",
      quantity: 1,
      unit: "u",
      unitPriceHT: 120,
      totalHT: 120,
    },
    {
      id: "l6",
      label: "Déplacement",
      quantity: 1,
      unit: "u",
      unitPriceHT: 45,
      totalHT: 45,
    },
  ],
  issues: [
    {
      id: "calcul-l3",
      lineId: "l3",
      note: "4 × 65 = 260, pas 280",
      detail: "Erreur de calcul : 4 heures à 65,00 € font 260,00 €, le devis indique 280,00 €.",
    },
    {
      id: "vague-l5",
      lineId: "l5",
      note: "Un forfait pour quoi ?",
      detail: "Ligne vague : « Forfait divers » ne précise pas ce qui est facturé.",
    },
  ],
  prices: [
    { lineId: "l1", delta: 340, source: { kind: "loupe", comparables: 23 } },
    { lineId: "l4", delta: 12, source: { kind: "ai" } },
  ],
  verdict: "negotiate",
  correctedAt: new Date("2026-10-03T09:00:00Z"),
};

/** Total HT tel qu'écrit sur le devis (somme des lignes affichées). */
export function demoTotals(quote: DemoQuote) {
  const totalHT = quote.lines.reduce((sum, line) => sum + line.totalHT, 0);
  const totalVAT = Math.round(totalHT * quote.vatRate * 100) / 100;
  return { totalHT, totalVAT, totalTTC: totalHT + totalVAT };
}
