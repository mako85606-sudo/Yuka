import { describe, expect, it } from "vitest";
import { sampleExtraction } from "@/fixtures/sample-extraction";
import { commonVatRate, printedLine, printedTotals } from "@/lib/analysis/printed";

describe("devis reconstruit à partir d'une lecture", () => {
  it("affiche l'unité et laisse vide ce qui n'a pas été lu", () => {
    const [first, second] = sampleExtraction.lines;
    if (!first || !second) throw new Error("fixture incomplète");
    expect(printedLine({ index: 0, line: first })).toEqual({
      id: "ligne-1",
      // Typographie française : l'unité reste collée à son nombre.
      label: "Chauffe-eau électrique 200\u00a0L",
      quantity: 1,
      unit: "u",
      unitPriceHT: 890,
      totalHT: 890,
    });
    expect(printedLine({ index: 1, line: second })).toMatchObject({
      quantity: null,
      unit: null,
      unitPriceHT: null,
      totalHT: 120,
    });
  });

  it("garde les totaux imprimés, même incomplets", () => {
    expect(printedTotals({ totalTTC: 1111 })).toEqual({ totalHT: null, totalVAT: null, totalTTC: 1111 });
  });

  it("n'affiche un taux de TVA que s'il est commun à toutes les lignes", () => {
    expect(commonVatRate(sampleExtraction.lines)).toBe(0.1);
    expect(
      commonVatRate([
        { label: "A", confidence: "high", vatRate: 10 },
        { label: "B", confidence: "high", vatRate: 20 },
      ]),
    ).toBeNull();
    expect(commonVatRate([{ label: "A", confidence: "high" }])).toBeNull();
  });
});
