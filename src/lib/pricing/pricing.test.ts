import { describe, expect, it } from "vitest";
import { DEPARTMENTS } from "@/config/departments";
import { regionOf } from "@/config/regions";
import { aiOpinion, comparablePrice, loupeOpinion } from "./opinions";
import { median, quantile } from "./stats";

describe("statistiques", () => {
  it("calcule la médiane, paire ou impaire", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });

  it("interpole les quartiles comme un tableur", () => {
    const values = [100, 200, 300, 400, 500];
    expect(quantile(values, 0.25)).toBe(200);
    expect(quantile(values, 0.75)).toBe(400);
    expect(quantile([10, 20], 0.25)).toBe(12.5);
  });

  it("refuse une liste vide", () => {
    expect(() => median([])).toThrow();
  });
});

describe("régions", () => {
  it("range chaque département dans une région", () => {
    for (const code of Object.keys(DEPARTMENTS)) expect(regionOf(code)).toBeDefined();
    expect(regionOf("69")).toBe("ARA");
    expect(regionOf("2A")).toBe("COR");
    expect(regionOf("974")).toBe("REU");
    expect(regionOf(undefined)).toBeUndefined();
  });
});

describe("comparablePrice", () => {
  it("compare dans l'unité de la prestation", () => {
    expect(
      comparablePrice({
        label: "Main-d'œuvre",
        confidence: "high",
        quantity: 3,
        unit: "heure",
        unitPriceHT: 58,
        canonicalItem: "plomberie.main-oeuvre",
      }),
    ).toEqual({ unit: "heure", unitPrice: 58, quantity: 3 });
  });

  it("assimile forfait et unité pour une prestation facturée une fois", () => {
    expect(
      comparablePrice({
        label: "Chauffe-eau 200 L",
        confidence: "high",
        quantity: 1,
        unit: "forfait",
        totalHT: 890,
        canonicalItem: "plomberie.chauffe-eau.fourniture.200l",
      }),
    ).toEqual({ unit: "unite", unitPrice: 890, quantity: 1 });
  });

  it("refuse de comparer un forfait à un prix à l'heure, ou une remise", () => {
    expect(
      comparablePrice({
        label: "Main-d'œuvre",
        confidence: "high",
        quantity: 1,
        unit: "forfait",
        unitPriceHT: 200,
        canonicalItem: "plomberie.main-oeuvre",
      }),
    ).toBeNull();
    expect(
      comparablePrice({ label: "Remise", confidence: "high", totalHT: -50, canonicalItem: "divers.remise" }),
    ).toBeNull();
  });
});

describe("avis de prix", () => {
  const price = { unit: "unite" as const, unitPrice: 890, quantity: 1 };

  it("ne donne pas de médiane sous 5 devis comparables", () => {
    expect(loupeOpinion(0, price, [500, 520, 540, 560])).toBeNull();
  });

  it("compare à la médiane de la base Loupe", () => {
    const opinion = loupeOpinion(0, price, [500, 520, 550, 580, 600]);
    expect(opinion).toMatchObject({
      source: { kind: "loupe", comparables: 5 },
      reference: { median: 550, p25: 520, p75: 580 },
      delta: 340,
    });
  });

  it("ne compte un écart à l'estimation IA qu'au-delà de la fourchette", () => {
    expect(aiOpinion(0, price, { low: 600, high: 800 }).delta).toBe(90);
    expect(aiOpinion(0, price, { low: 700, high: 1000 }).delta).toBe(0);
    expect(aiOpinion(0, { ...price, quantity: 2 }, { low: 1000, high: 1200 }).delta).toBe(-220);
    expect(aiOpinion(0, price, { low: 600, high: 800 }).source).toEqual({ kind: "ai" });
  });
});
