import { describe, expect, it } from "vitest";
import { describeDelta, describeReference, describeSource } from "@/lib/price-wording";

describe("avis de prix", () => {
  it("cite la base Loupe et le nombre de devis comparables", () => {
    expect(describeSource({ kind: "loupe", comparables: 23 })).toBe(
      "Base Loupe · 23 devis comparables",
    );
    expect(describeDelta(340, { kind: "loupe", comparables: 23 })).toBe(
      "au-dessus de la médiane",
    );
  });

  it("ne présente jamais une estimation IA comme un prix de marché", () => {
    const ai = { kind: "ai" } as const;
    const wording = [describeReference(ai), describeSource(ai), describeDelta(-80, ai)].join(" ");
    expect(wording).toContain("estimation IA");
    expect(describeSource(ai)).toContain("confiance faible");
    expect(wording).not.toMatch(/médiane|marché/i);
  });

  it("gère l'écart nul et l'arrondi", () => {
    expect(describeDelta(0.3, { kind: "loupe", comparables: 8 })).toBe("pile sur la médiane");
    expect(describeDelta(-0.6, { kind: "ai" })).toBe("en dessous de l'estimation IA");
  });
});
