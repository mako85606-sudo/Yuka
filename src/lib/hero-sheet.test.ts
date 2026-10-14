import { describe, expect, it } from "vitest";
import { plumbingQuote } from "@/fixtures/demo-quotes";
import { handAmount, heroFocusLine, heroMark, heroRows, printedTotals } from "@/lib/hero-sheet";

const line = (id: string) => {
  const found = plumbingQuote.lines.find((item) => item.id === id);
  if (!found) throw new Error(id);
  return found;
};

describe("feuille du hero", () => {
  it("corrige d'emblée la ligne de main-d'œuvre, avec le vrai calcul", () => {
    expect(heroFocusLine(plumbingQuote)?.id).toBe("l2");
    const mark = heroMark(plumbingQuote, line("l2"));
    expect(mark.kind).toBe("calculation");
    expect(mark.kind === "calculation" && mark.correct).toBe("260");
    expect(mark.note.replace(/\u00a0/g, " ")).toBe("4 h × 65 € = 260, pas 275");
  });

  it("surligne la ligne vague, commente les prix avec leur source, coche le reste", () => {
    expect(heroMark(plumbingQuote, line("l4")).kind).toBe("vague");
    const price = heroMark(plumbingQuote, line("l1"));
    expect(price).toMatchObject({ kind: "price", caption: "Base Loupe · 23 devis" });
    expect(price.note).toContain("médiane");
    const estimate = heroMark(plumbingQuote, line("l3"));
    expect(estimate).toMatchObject({ kind: "price", caption: "Confiance faible" });
    // Une estimation IA n'est jamais présentée comme un prix de marché : la note le dit.
    expect(estimate.note).toContain("estimation IA");
    expect(estimate.note).not.toContain("médiane");
    expect(heroMark(plumbingQuote, line("l5")).kind).toBe("ok");
  });

  it("annonce un total TTC de 1 526,80 €, arrondi à 1 527 € dans le texte du hero", () => {
    expect(plumbingQuote.totals.totalTTC).toBeCloseTo(1526.8, 2);
    expect(Math.round(plumbingQuote.totals.totalTTC)).toBe(1527);
    expect(printedTotals(plumbingQuote).at(-1)?.amount.replace(/\s/g, " ")).toBe("1 526,80 €");
  });

  it("tape les lignes puis les totaux", () => {
    expect(heroRows(plumbingQuote)).toHaveLength(plumbingQuote.lines.length + 3);
  });

  it("écrit les montants comme une main : sans centimes s'ils sont nuls", () => {
    expect(handAmount(260)).toBe("260");
    expect(handAmount(18.5)).toBe("18,50");
  });
});
