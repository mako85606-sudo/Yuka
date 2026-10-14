import { describe, expect, it } from "vitest";
import { between, createRandom, hashString, randomSign } from "@/lib/seeded-random";

describe("hashString", () => {
  it("donne toujours le même hash pour la même chaîne", () => {
    expect(hashString("ligne-3")).toBe(hashString("ligne-3"));
  });

  it("distingue des chaînes proches", () => {
    expect(hashString("ligne-3")).not.toBe(hashString("ligne-4"));
  });

  it("renvoie un entier 32 bits non signé", () => {
    const hash = hashString("Forfait divers");
    expect(Number.isInteger(hash)).toBe(true);
    expect(hash).toBeGreaterThanOrEqual(0);
    expect(hash).toBeLessThan(2 ** 32);
  });
});

describe("createRandom", () => {
  it("rejoue exactement la même suite pour la même graine", () => {
    const a = createRandom("analyse-42");
    const b = createRandom("analyse-42");
    const first = Array.from({ length: 20 }, a);
    const second = Array.from({ length: 20 }, b);
    expect(first).toEqual(second);
  });

  it("produit une autre suite pour une autre graine", () => {
    const a = Array.from({ length: 5 }, createRandom("a"));
    const b = Array.from({ length: 5 }, createRandom("b"));
    expect(a).not.toEqual(b);
  });

  it("reste dans [0, 1) et se répartit à peu près uniformément", () => {
    const random = createRandom(7);
    const samples = Array.from({ length: 20000 }, random);
    expect(Math.min(...samples)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...samples)).toBeLessThan(1);
    const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
    expect(mean).toBeGreaterThan(0.48);
    expect(mean).toBeLessThan(0.52);
  });
});

describe("between et randomSign", () => {
  it("borne les valeurs", () => {
    const random = createRandom("bornes");
    for (let i = 0; i < 1000; i += 1) {
      const value = between(random, -12, -8);
      expect(value).toBeGreaterThanOrEqual(-12);
      expect(value).toBeLessThan(-8);
    }
  });

  it("ne renvoie que -1 ou 1", () => {
    const random = createRandom("signe");
    const signs = new Set(Array.from({ length: 200 }, () => randomSign(random)));
    expect([...signs].sort()).toEqual([-1, 1]);
  });
});
