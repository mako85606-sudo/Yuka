import { describe, expect, it } from "vitest";
import { sampleExtraction } from "@/fixtures/sample-extraction";
import { REDACTED } from "@/lib/anonymize";
import { departmentLabel, normalizeDepartment } from "@/lib/department";
import { MAX_LINES, normalizeExtraction } from "@/lib/extraction/normalize";
import type { ExtractedLine } from "@/lib/extraction/schema";

describe("normalizeDepartment", () => {
  it.each([
    ["69", "69"],
    [" 69 ", "69"],
    ["69003", "69"],
    ["1", "01"],
    ["2a", "2A"],
    ["2B", "2B"],
    ["20", "20"],
    ["97411", "974"],
    ["972", "972"],
  ])("ramène « %s » à « %s »", (raw, expected) => {
    expect(normalizeDepartment(raw)).toBe(expected);
  });

  it.each(["", "00", "96", "99", "975", "Lyon", "6900", "690033"])("écarte « %s »", (raw) => {
    expect(normalizeDepartment(raw)).toBeUndefined();
  });

  it("donne un libellé lisible", () => {
    expect(departmentLabel("69")).toBe("Rhône (69)");
    expect(departmentLabel("974")).toBe("La Réunion (974)");
  });
});

describe("normalizeExtraction", () => {
  it("garde une extraction propre telle quelle", () => {
    expect(normalizeExtraction(sampleExtraction)).toEqual(sampleExtraction);
  });

  it("anonymise les libellés et l'objet", () => {
    const result = normalizeExtraction({
      ...sampleExtraction,
      subject: "Chauffe-eau chez M. Dupont",
      lines: [{ label: "Déplacement 69003 Lyon", confidence: "high", totalHT: 45 }],
    });
    expect(result.subject).toBe(`Chauffe-eau chez ${REDACTED}`);
    expect(result.lines[0]?.label).toBe(`Déplacement ${REDACTED}`);
  });

  it("ne corrige jamais un calcul faux", () => {
    const wrong: ExtractedLine = {
      label: "Main-d'œuvre",
      confidence: "high",
      quantity: 4,
      unitPriceHT: 65,
      totalHT: 280,
    };
    const result = normalizeExtraction({ ...sampleExtraction, lines: [wrong] });
    expect(result.lines[0]).toMatchObject({ quantity: 4, unitPriceHT: 65, totalHT: 280 });
  });

  it("arrondit les montants au centime", () => {
    const result = normalizeExtraction({
      ...sampleExtraction,
      lines: [{ label: "Câble", confidence: "high", unitPriceHT: 1.23456, totalHT: 12.34567 }],
      totals: { totalHT: 12.345678 },
    });
    expect(result.lines[0]).toMatchObject({ unitPriceHT: 1.23, totalHT: 12.35 });
    expect(result.totals.totalHT).toBe(12.35);
  });

  it("remet en pourcentage un taux de TVA écrit en fraction, s'il est connu", () => {
    const lines: ExtractedLine[] = [
      { label: "A", confidence: "high", vatRate: 0.2 },
      { label: "B", confidence: "high", vatRate: 0.055 },
      { label: "C", confidence: "high", vatRate: 19.6 },
      { label: "D", confidence: "high", vatRate: 0.3 },
    ];
    const result = normalizeExtraction({ ...sampleExtraction, lines });
    expect(result.lines.map((line) => line.vatRate)).toEqual([20, 5.5, 19.6, 0.3]);
  });

  it("écarte les valeurs hors bornes au lieu de les garder", () => {
    const result = normalizeExtraction({
      ...sampleExtraction,
      meta: { ...sampleExtraction.meta, depositPercent: 130, validityDays: 0, department: "Lyon" },
    });
    expect(result.meta.depositPercent).toBeUndefined();
    expect(result.meta.validityDays).toBeUndefined();
    expect(result.meta.department).toBeUndefined();
  });

  it("plafonne le nombre de lignes et nomme les lignes vides", () => {
    const lines = Array.from({ length: MAX_LINES + 5 }, (): ExtractedLine => ({
      label: "  ",
      confidence: "low",
    }));
    const result = normalizeExtraction({ ...sampleExtraction, lines });
    expect(result.lines).toHaveLength(MAX_LINES);
    expect(result.lines[0]?.label).toBe("Ligne sans désignation");
  });
});
