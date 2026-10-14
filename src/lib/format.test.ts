import { describe, expect, it } from "vitest";
import {
  formatAmount,
  formatEuros,
  formatQuantity,
  formatRate,
  formatShortDate,
  formatSignedEuros,
  formatStampDate,
  MINUS_SIGN,
} from "@/lib/format";

const NNBSP = " "; // espace fine insécable (milliers)
const NBSP = " "; // espace insécable (avant € et %)

describe("formatEuros", () => {
  it("écrit les montants à la française", () => {
    expect(formatEuros(1315.5)).toBe(`1${NNBSP}315,50${NBSP}€`);
    expect(formatEuros(1315.5, 0)).toBe(`1${NNBSP}316${NBSP}€`);
  });

  it("utilise un vrai signe moins", () => {
    expect(formatEuros(-12)).toBe(`${MINUS_SIGN}12,00${NBSP}€`);
  });
});

describe("formatSignedEuros", () => {
  it("signe les écarts", () => {
    expect(formatSignedEuros(340)).toBe(`+340${NBSP}€`);
    expect(formatSignedEuros(-120)).toBe(`${MINUS_SIGN}120${NBSP}€`);
  });

  it("n'affiche jamais « −0 € »", () => {
    expect(formatSignedEuros(0)).toBe(`0${NBSP}€`);
    expect(formatSignedEuros(-0.4)).toBe(`0${NBSP}€`);
  });
});

describe("formats de colonnes", () => {
  it("formate un montant de ligne sans symbole", () => {
    expect(formatAmount(890)).toBe("890,00");
    expect(formatAmount(1468.5)).toBe(`1${NNBSP}468,50`);
  });

  it("formate quantités et taux", () => {
    expect(formatQuantity(4)).toBe("4");
    expect(formatQuantity(2.5)).toBe("2,5");
    expect(formatRate(0.1)).toBe(`10${NBSP}%`);
    expect(formatRate(0.055)).toBe(`5,5${NBSP}%`);
  });
});

describe("dates", () => {
  it("utilise l'heure de Paris, quel que soit le fuseau du serveur", () => {
    // 22 h UTC le 11 septembre = minuit le 12 à Paris (heure d'été).
    const date = new Date(Date.UTC(2026, 8, 11, 22, 0));
    expect(formatShortDate(date)).toBe("12/09/2026");
    expect(formatStampDate(new Date(Date.UTC(2026, 9, 3, 9)))).toBe("03 oct. 2026");
  });
});
