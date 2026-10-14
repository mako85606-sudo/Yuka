import { describe, expect, it } from "vitest";
import { electricQuote, plumbingQuote } from "@/fixtures/demo-quotes";
import { describeCorrection, roundCents, totalsFromLines } from "@/lib/scene-quote";

describe("totalsFromLines", () => {
  it("additionne les lignes et calcule TVA et TTC au centime", () => {
    const totals = totalsFromLines(
      [
        { id: "a", label: "A", quantity: 1, unit: "u", unitPriceHT: 10.1, totalHT: 10.1 },
        { id: "b", label: "B", quantity: 1, unit: "u", unitPriceHT: 0.2, totalHT: 0.2 },
      ],
      0.055,
    );
    expect(totals).toEqual({ totalHT: 10.3, totalVAT: 0.57, totalTTC: 10.87 });
  });

  it("arrondit sans dériver", () => {
    expect(roundCents(0.1 + 0.2)).toBe(0.3);
  });
});

describe("describeCorrection", () => {
  it("résume les problèmes vérifiés et le verdict", () => {
    const text = describeCorrection(plumbingQuote);
    expect(text).toContain("2 problèmes vérifiés");
    expect(text).toContain("4 heures à 65,00\u00A0€ font 260,00\u00A0€");
    expect(text).toContain("2 avis de prix");
    expect(text).toMatch(/Verdict : à négocier\.$/);
  });

  it("dit quand il n'y a rien à redire", () => {
    const text = describeCorrection(electricQuote);
    expect(text).toContain("aucune erreur");
    expect(text).toMatch(/Verdict : correct\.$/);
  });
});
