import { describe, expect, it } from "vitest";
import { demoQuotes, plumbingQuote } from "@/fixtures/demo-quotes";
import { demoSavings } from "@/lib/demo-outcome";
import { formatEuros } from "@/lib/format";
import { describePhoneResult, phoneResult } from "@/lib/phone-demo";

describe("phoneResult", () => {
  const result = phoneResult(plumbingQuote);

  it("annonce l'économie des règles réelles (haut de fourchette)", () => {
    expect(result.savings).toBe(demoSavings(plumbingQuote));
    expect(result.savings).toBe(218);
  });

  it("barre le montant imprimé et donne le bon à côté", () => {
    const calculation = result.findings.find((finding) => finding.kind === "calculation");
    expect(calculation).toMatchObject({
      label: "Main-d'œuvre",
      printed: formatEuros(275),
      corrected: formatEuros(260),
    });
  });

  it("place les erreurs vérifiées avant les points d'attention, puis les avis de prix", () => {
    expect(result.findings.map((finding) => finding.kind)).toEqual(["calculation", "vague-line", "price", "price"]);
  });

  it("dit la source de chaque avis de prix, et ne fait jamais passer une estimation IA pour une médiane", () => {
    const prices = result.findings.filter((finding) => finding.kind === "price");
    expect(prices[0]).toMatchObject({ estimate: false, source: "Base Loupe · 23 devis comparables", shortSource: "Base Loupe · 23 devis" });
    expect(prices[1]).toMatchObject({ estimate: true, source: "Estimation IA · confiance faible", shortSource: "Confiance faible" });
  });

  it("vaut pour chaque démo : une carte par erreur et par prix au-dessus de sa référence", () => {
    for (const quote of demoQuotes) {
      const { findings } = phoneResult(quote);
      const above = quote.prices.filter((price) => Math.round(price.delta) > 0).length;
      expect(findings).toHaveLength(quote.issues.length + above);
    }
  });

  it("se décrit en une phrase pour les lecteurs d'écran", () => {
    const text = describePhoneResult(plumbingQuote, result);
    expect(text).toContain("Exemple fictif");
    expect(text).toContain(`jusqu'à ${formatEuros(218, 0)}`);
    expect(text).toContain("estimation IA");
  });
});
