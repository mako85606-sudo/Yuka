import { describe, expect, it } from "vitest";
import { demoQuotes } from "@/fixtures/demo-quotes";
import { tradeQuotes } from "@/fixtures/trade-quotes";
import { demoSavings, demoVerdict } from "@/lib/demo-outcome";
import { roundCents, totalsFromLines } from "@/lib/scene-quote";

/**
 * Les démos doivent être honnêtes : une erreur annoncée existe vraiment dans
 * les chiffres, une ligne sans erreur annoncée est juste, et le verdict est
 * celui que les règles de l'analyse réelle rendraient.
 */
const allQuotes = [...demoQuotes, ...tradeQuotes];

describe.each(allQuotes.map((quote) => [quote.id, quote] as const))("démo %s", (_id, quote) => {
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

  it("rend le verdict que donneraient les règles de l'analyse", () => {
    expect(quote.verdict).toBe(demoVerdict(quote));
  });

  it("n'annonce une économie que s'il y a quelque chose à négocier", () => {
    if (quote.verdict === "ok") expect(demoSavings(quote)).toBeNull();
    else expect(demoSavings(quote)).toBeGreaterThan(0);
  });

  it("ne prépare un message que sur des erreurs vérifiées, avec les bons chiffres", () => {
    if (!quote.message) return;
    expect(quote.verdict).not.toBe("ok");
    expect(quote.message).toMatch(/^Bonjour/);
    expect(quote.message).toContain("?");
    for (const issue of quote.issues.filter((item) => item.kind === "calculation")) {
      const line = quote.lines.find((item) => item.id === issue.lineId);
      if (!line) continue;
      expect(quote.message).toContain(String(line.totalHT));
    }
  });
});

describe("boucle de démo", () => {
  it("montre un verdict de chaque couleur", () => {
    expect(new Set(demoQuotes.map((quote) => quote.verdict))).toEqual(
      new Set(["ok", "negotiate", "alert"]),
    );
  });

  it("a un message pour chaque devis à négocier", () => {
    for (const quote of demoQuotes) {
      if (quote.verdict !== "ok") expect(quote.message).toBeTruthy();
    }
  });
});

describe("carrousel des métiers", () => {
  it("montre un verdict de chaque couleur, sur des métiers tous différents", () => {
    expect(new Set(tradeQuotes.map((quote) => quote.verdict))).toEqual(
      new Set(["ok", "negotiate", "alert"]),
    );
    expect(new Set(tradeQuotes.map((quote) => quote.category)).size).toBe(tradeQuotes.length);
  });

  it("garde des identifiants uniques (ils fixent les tracés à la main)", () => {
    const ids = [...demoQuotes, ...tradeQuotes].map((quote) => quote.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
