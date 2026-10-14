import { describe, expect, it } from "vitest";
import { cleanExtraction, extractionWith, withLine } from "@/test/extraction";
import { checkLineCalculations, checkTotalHT, checkTotalTTC, checkTotalVAT, expectedVat } from "./calculations";

const NBSP = " ";

describe("checkLineCalculations", () => {
  it("ne dit rien quand quantité × prix unitaire = montant", () => {
    expect(checkLineCalculations(cleanExtraction)).toEqual([]);
  });

  it("tolère un arrondi au centime", () => {
    expect(checkLineCalculations(withLine(1, { quantity: 1.5, unitPriceHT: 72.33, totalHT: 108.5 }))).toEqual([]);
  });

  it("relève une ligne mal calculée, avec ce qu'elle coûte en trop", () => {
    const [finding] = checkLineCalculations(withLine(1, { totalHT: 184 }));
    expect(finding).toMatchObject({
      id: "line-calculation-1",
      kind: "error",
      confirmed: true,
      lineIndex: 1,
      note: "3 × 58 = 174, pas 184",
      amount: 10,
    });
    expect(finding?.detail).toBe(
      `Erreur de calcul ligne 2${NBSP}: 3${NBSP}h × 58,00${NBSP}€ font 174,00${NBSP}€, le devis indique 184,00${NBSP}€.`,
    );
  });

  it("présente l'erreur « à confirmer » si la ligne a été mal lue", () => {
    const [finding] = checkLineCalculations(withLine(1, { totalHT: 184, confidence: "low" }));
    expect(finding?.confirmed).toBe(false);
  });

  it("ne vérifie pas une ligne incomplète", () => {
    expect(checkLineCalculations(withLine(1, { unitPriceHT: undefined, totalHT: 999 }))).toEqual([]);
  });
});

describe("checkTotalHT", () => {
  it("ne dit rien quand les lignes font le total", () => {
    expect(checkTotalHT(cleanExtraction)).toEqual([]);
  });

  it("relève un total HT qui ne correspond pas aux lignes", () => {
    const [finding] = checkTotalHT(extractionWith({ totals: { totalHT: 903 } }));
    expect(finding).toMatchObject({ id: "total-ht", amount: 10, note: "Total des lignes : 893, pas 903" });
  });

  it("ne conclut rien si une ligne n'a pas de montant", () => {
    expect(checkTotalHT(extractionWith({ totals: { totalHT: 903 }, lines: [{ label: "A", confidence: "high" }] }))).toEqual([]);
  });
});

describe("checkTotalVAT", () => {
  it("ne dit rien quand la TVA correspond au taux", () => {
    expect(checkTotalVAT(cleanExtraction)).toEqual([]);
  });

  it("relève une TVA mal calculée", () => {
    const [finding] = checkTotalVAT(extractionWith({ totals: { totalVAT: 98.3 } }));
    expect(finding).toMatchObject({ id: "total-vat", amount: 9 });
    expect(finding?.detail).toContain(`10${NBSP}% de 893,00${NBSP}€`);
  });

  it("additionne la TVA par taux quand le devis en mélange plusieurs", () => {
    const mixed = extractionWith({
      lines: [
        { label: "Pompe à chaleur", confidence: "high", totalHT: 1000, vatRate: 5.5 },
        { label: "Pose", confidence: "high", totalHT: 200, vatRate: 10 },
      ],
      totals: { totalHT: 1200, totalVAT: 75, totalTTC: 1275 },
    });
    expect(expectedVat(mixed)?.expected).toBe(75);
    expect(checkTotalVAT(mixed)).toEqual([]);
    expect(checkTotalVAT(extractionWith({ ...mixed, totals: { ...mixed.totals, totalVAT: 85 } }))).toHaveLength(1);
  });
});

describe("checkTotalTTC", () => {
  it("ne dit rien quand HT + TVA = TTC", () => {
    expect(checkTotalTTC(cleanExtraction)).toEqual([]);
  });

  it("relève un total TTC faux", () => {
    const [finding] = checkTotalTTC(extractionWith({ totals: { totalTTC: 992.3 } }));
    expect(finding).toMatchObject({ id: "total-ttc", amount: 10, note: "HT + TVA = 982,30, pas 992,30" });
  });

  it("recalcule la TVA absente quand un seul taux vaut pour tout le devis", () => {
    expect(checkTotalTTC(extractionWith({ totals: { totalVAT: undefined } }))).toEqual([]);
    expect(checkTotalTTC(extractionWith({ totals: { totalVAT: undefined, totalTTC: 999 } }))).toHaveLength(1);
  });
});
