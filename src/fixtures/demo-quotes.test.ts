import { describe, expect, it } from "vitest";
import { demoQuotes } from "@/fixtures/demo-quotes";
import { roundCents, totalsFromLines } from "@/lib/scene-quote";

/**
 * Les démos doivent être honnêtes : une erreur annoncée existe vraiment dans
 * les chiffres, et une ligne sans erreur annoncée est juste.
 */
describe.each(demoQuotes.map((quote) => [quote.id, quote] as const))("démo %s", (_id, quote) => {
  const lineIds = new Set(quote.lines.map((line) => line.id));
  const calculationLines = new Set(
    quote.issues.filter((issue) => issue.kind === "calculation").map((issue) => issue.lineId),
  );

  it("n'annote que des lignes qui existent", () => {
    for (const issue of quote.issues) expect(lineIds.has(issue.lineId)).toBe(true);
    for (const price of quote.prices) expect(lineIds.has(price.lineId)).toBe(true);
  });

  it("annonce exactement les erreurs de calcul présentes", () => {
    for (const line of quote.lines) {
      const expected = roundCents(line.quantity * line.unitPriceHT);
      if (calculationLines.has(line.id)) {
        expect(line.totalHT).not.toBe(expected);
      } else {
        expect(line.totalHT).toBe(expected);
      }
    }
  });

  it("écrit le bon résultat dans la note d'une erreur de calcul", () => {
    for (const issue of quote.issues.filter((item) => item.kind === "calculation")) {
      const line = quote.lines.find((item) => item.id === issue.lineId);
      expect(line).toBeDefined();
      if (!line) continue;
      expect(issue.note).toContain(String(line.quantity * line.unitPriceHT));
      expect(issue.note).toContain(String(line.totalHT));
    }
  });

  it("a des totaux cohérents avec ses lignes", () => {
    expect(quote.totals).toEqual(totalsFromLines(quote.lines, quote.vatRate));
  });

  it("ne rend un verdict « Correct » que sans problème", () => {
    if (quote.verdict === "ok") expect(quote.issues).toHaveLength(0);
    else expect(quote.issues.length).toBeGreaterThan(0);
  });
});

describe("boucle de démo", () => {
  it("montre un verdict de chaque couleur", () => {
    expect(new Set(demoQuotes.map((quote) => quote.verdict))).toEqual(
      new Set(["ok", "negotiate", "alert"]),
    );
  });
});
