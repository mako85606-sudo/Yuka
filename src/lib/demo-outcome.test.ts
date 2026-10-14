import { describe, expect, it } from "vitest";
import { demoOvercharge, demoSavings, demoVerdict, describeOutcome } from "@/lib/demo-outcome";
import { totalsFromLines, type SceneLine, type SceneQuote } from "@/lib/scene-quote";

function quote(lines: readonly SceneLine[], extra: Partial<SceneQuote> = {}): SceneQuote {
  return {
    id: "essai",
    category: "Plomberie",
    department: "Rhône (69)",
    title: "Essai",
    issuedAt: new Date("2026-09-01T08:00:00Z"),
    validityDays: 30,
    vatRate: 0.2,
    lines,
    totals: totalsFromLines(lines, 0.2),
    issues: [],
    prices: [],
    verdict: "ok",
    correctedAt: new Date("2026-09-02T08:00:00Z"),
    ...extra,
  };
}

const fair: SceneLine = { id: "l1", label: "Pose", quantity: 2, unit: "h", unitPriceHT: 50, totalHT: 100 };

describe("demoOvercharge", () => {
  it("compte le trop-payé TTC des erreurs de calcul", () => {
    const wrong: SceneLine = { ...fair, totalHT: 120 };
    expect(demoOvercharge(quote([wrong]))).toBe(24);
  });

  it("vaut zéro si l'erreur joue en faveur du client", () => {
    const low: SceneLine = { ...fair, totalHT: 90 };
    expect(demoOvercharge(quote([low]))).toBe(0);
  });
});

describe("demoVerdict", () => {
  it("rend « Correct » sans erreur ni prix haut", () => {
    expect(demoVerdict(quote([fair]))).toBe("ok");
  });

  it("demande de vérifier sérieusement dès 20 € de trop-payé", () => {
    const wrong: SceneLine = { ...fair, totalHT: 117 };
    const issues = [{ id: "c", kind: "calculation" as const, lineId: "l1", note: "", detail: "" }];
    expect(demoVerdict(quote([wrong], { issues }))).toBe("alert");
  });

  it("invite à négocier sous ce seuil", () => {
    const wrong: SceneLine = { ...fair, totalHT: 110 };
    const issues = [{ id: "c", kind: "calculation" as const, lineId: "l1", note: "", detail: "" }];
    expect(demoVerdict(quote([wrong], { issues }))).toBe("negotiate");
  });

  it("suit les seuils de la base Loupe (+15 % à négocier, +60 % à vérifier)", () => {
    // Ligne à 100 € : médiane à 80 € (+25 %), puis à 50 € (+100 %).
    expect(demoVerdict(quote([fair], { prices: [{ lineId: "l1", delta: 20, source: { kind: "loupe", comparables: 9 } }] }))).toBe(
      "negotiate",
    );
    expect(demoVerdict(quote([fair], { prices: [{ lineId: "l1", delta: 50, source: { kind: "loupe", comparables: 9 } }] }))).toBe(
      "alert",
    );
  });

  it("ne mène jamais à « vérifier sérieusement » sur une estimation IA", () => {
    expect(demoVerdict(quote([fair], { prices: [{ lineId: "l1", delta: 90, source: { kind: "ai" } }] }))).toBe("negotiate");
  });
});

describe("demoSavings", () => {
  it("additionne trop-payé et écarts au-dessus des références", () => {
    const wrong: SceneLine = { ...fair, totalHT: 110 };
    const issues = [{ id: "c", kind: "calculation" as const, lineId: "l1", note: "", detail: "" }];
    const prices = [{ lineId: "l1", delta: 30, source: { kind: "ai" as const } }];
    expect(demoSavings(quote([wrong], { issues, prices }))).toBe(42);
  });

  it("n'annonce rien pour un devis correct", () => {
    expect(demoSavings(quote([fair], { prices: [{ lineId: "l1", delta: -10, source: { kind: "loupe", comparables: 9 } }] }))).toBeNull();
  });
});

describe("describeOutcome", () => {
  it("annonce l'économie et le message proposé", () => {
    const wrong: SceneLine = { ...fair, totalHT: 110 };
    const issues = [{ id: "c", kind: "calculation" as const, lineId: "l1", note: "", detail: "" }];
    const text = describeOutcome({ ...quote([wrong], { issues, verdict: "negotiate" }), message: "Bonjour, pourriez-vous vérifier ?" });
    // Espaces insécables de la typographie française ramenées à des espaces simples pour comparer.
    expect(text.replace(/[\u00A0\u202F]/g, " ")).toBe("Économie possible : jusqu'à 12 €. Message proposé : « Bonjour, pourriez-vous vérifier ? »");
  });

  it("dit qu'il n'y a rien à négocier sur un devis correct", () => {
    expect(describeOutcome(quote([fair]))).toBe("Rien à négocier.");
  });
});
