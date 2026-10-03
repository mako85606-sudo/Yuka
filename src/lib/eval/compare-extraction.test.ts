import { describe, expect, it } from "vitest";
import { expectedExtraction, quoteFixtures } from "@/fixtures/quotes/definitions";
import {
  alignLines,
  compareExtraction,
  findLeaks,
  labelSimilarity,
  tallyByField,
} from "@/lib/eval/compare-extraction";
import type { Extraction } from "@/lib/extraction/schema";

const fixture = quoteFixtures[1];
if (!fixture) throw new Error("jeu de test vide");
const truth = expectedExtraction(fixture);

describe("labelSimilarity", () => {
  it("reconnaît une reformulation légère", () => {
    expect(labelSimilarity("Main-d'œuvre atelier", "Main d'oeuvre atelier")).toBe(1);
    expect(labelSimilarity("Disques de frein avant (paire)", "Disques de frein AV, la paire")).toBeGreaterThan(0.6);
  });

  it("distingue deux lignes différentes", () => {
    expect(labelSimilarity("Plaquettes de frein avant", "Ingrédients et produits d'atelier")).toBeLessThan(0.3);
  });
});

describe("compareExtraction", () => {
  it("donne 100 % à une lecture parfaite", () => {
    const results = compareExtraction(truth, truth);
    expect(results.every((result) => result.ok)).toBe(true);
    expect(results.filter((result) => result.field.startsWith("lines.")).length).toBe(
      1 + truth.lines.length * 7,
    );
  });

  it("compte faux un montant mal lu, juste un montant à un centime près", () => {
    const [first, second, ...rest] = truth.lines;
    if (!first || !second) throw new Error("fixture incomplète");
    const actual: Extraction = {
      ...truth,
      lines: [{ ...first, totalHT: (first.totalHT ?? 0) + 0.004 }, { ...second, totalHT: 189.9 }, ...rest],
    };
    const wrong = compareExtraction(truth, actual).filter((result) => !result.ok);
    expect(wrong).toEqual([{ field: "lines.totalHT", ok: false, expected: 198.9, actual: 189.9 }]);
  });

  it("retrouve les lignes même dans le désordre, et compte faux une ligne oubliée", () => {
    const reversed = [...truth.lines].reverse();
    expect(alignLines(truth.lines, reversed)).toEqual(truth.lines);

    const missing: Extraction = { ...truth, lines: truth.lines.slice(1) };
    const results = compareExtraction(truth, missing);
    expect(results.find((result) => result.field === "lines.count")?.ok).toBe(false);
    expect(results.filter((result) => !result.ok && result.field === "lines.label")).toHaveLength(1);
  });

  it("additionne par champ", () => {
    const tallies = tallyByField([
      { field: "category", ok: true, expected: "a", actual: "a" },
      { field: "category", ok: false, expected: "a", actual: "b" },
    ]);
    expect(tallies).toEqual([{ field: "category", correct: 1, total: 2 }]);
  });
});

describe("findLeaks", () => {
  it("repère une donnée personnelle recopiée", () => {
    const actual = { ...truth, subject: "Freins de la 308 AB-123-CD de Mme Claire Fontaine" };
    expect(findLeaks(actual, ["Claire Fontaine", "AB-123-CD", "Bordeaux"])).toEqual([
      "Claire Fontaine",
      "AB-123-CD",
    ]);
    expect(findLeaks(truth, ["Claire Fontaine", "AB-123-CD"])).toEqual([]);
  });
});
