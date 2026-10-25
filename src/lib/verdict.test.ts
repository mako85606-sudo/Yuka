import { describe, expect, it } from "vitest";
import { expectedExtraction, quoteFixtures } from "@/fixtures/quotes/definitions";
import type { PriceOpinion } from "@/lib/analysis/result";
import { computeOvercharge, runChecks } from "@/lib/checks";
import { aiOpinion, loupeOpinion } from "@/lib/pricing/opinions";
import { cleanExtraction, extractionWith } from "@/test/extraction";
import { decideVerdict } from "./verdict";

function verdictFor(extraction = cleanExtraction, prices: readonly PriceOpinion[] = []) {
  return decideVerdict({
    extraction,
    findings: runChecks(extraction),
    prices,
    overcharge: computeOvercharge(extraction),
  });
}

const price = { unit: "unite" as const, unitPrice: 689, quantity: 1 };
const base = [500, 520, 540, 560, 580];

describe("decideVerdict", () => {
  it("rend « Correct » à un devis propre, avec ce qui a été vérifié", () => {
    const result = verdictFor();
    expect(result).toMatchObject({ verdict: "ok", savings: null, overcharge: 0 });
    expect(result.keyPoints).toContain("Les calculs sont justes.");
  });

  it("invite à négocier un prix nettement au-dessus de la médiane", () => {
    const opinion = loupeOpinion(0, price, base);
    if (!opinion) throw new Error("avis attendu");
    const result = verdictFor(cleanExtraction, [opinion]);
    expect(result.verdict).toBe("negotiate");
    // Au-dessus du 3e quartile (560) et de la médiane (540).
    expect(result.savings).toEqual({ low: 129, high: 149 });
    expect(result.keyPoints[0]).toContain("au-dessus de la médiane de 5 devis comparables");
  });

  it("demande de vérifier sérieusement un prix très au-dessus de la base Loupe", () => {
    const opinion = loupeOpinion(0, { ...price, unitPrice: 990 }, base);
    if (!opinion) throw new Error("avis attendu");
    expect(verdictFor(cleanExtraction, [opinion]).verdict).toBe("alert");
  });

  it("ne va jamais au-delà de « À négocier » sur la seule foi d'une estimation IA", () => {
    const opinion = aiOpinion(0, { ...price, unitPrice: 2000 }, { low: 400, high: 600 });
    const result = verdictFor(cleanExtraction, [opinion]);
    expect(result.verdict).toBe("negotiate");
    expect(result.savings).toEqual({ low: 0, high: 1400 });
    expect(result.keyPoints.join(" ")).toContain("estimée par l'IA (confiance faible)");
  });

  it("ne s'appuie pas sur un constat à confirmer pour sonner l'alerte", () => {
    const misread = extractionWith({ issuer: { hasSiret: false }, confidence: { issuer: "low" } });
    const result = verdictFor(misread);
    expect(result.verdict).toBe("negotiate");
    expect(result.keyPoints[0]).toMatch(/^À confirmer sur votre devis/);
  });

  it("n'annonce pas d'économie sur un devis « Correct », même un peu au-dessus de la médiane", () => {
    const opinion = loupeOpinion(0, { ...price, unitPrice: 600 }, base);
    if (!opinion) throw new Error("avis attendu");
    const result = verdictFor(cleanExtraction, [opinion]);
    expect(result).toMatchObject({ verdict: "ok", savings: null });
    expect(result.keyPoints).toContain("Les prix comparés sont dans la norme de votre région.");
  });

  it("rappelle le délai de rétractation d'un contrat signé à domicile", () => {
    const atHome = extractionWith({ meta: { isDoorToDoorSale: true } });
    const ok = verdictFor(atHome);
    expect(ok.verdict).toBe("ok");
    expect(ok.keyPoints).toHaveLength(3);
    expect(ok.keyPoints[2]).toContain("14 jours");

    const deposit = verdictFor(extractionWith({ meta: { isDoorToDoorSale: true, depositPercent: 50 } }));
    expect(deposit.verdict).toBe("negotiate");
    expect(deposit.keyPoints.at(-1)).toContain("14 jours");
  });

  it("ne donne jamais plus de trois points clés", () => {
    const messy = extractionWith({
      issuer: { hasSiret: false, hasCompanyName: false, hasValidityDate: false, hasClientIdentity: false },
      meta: { depositPercent: 60 },
      totals: { totalTTC: 1200 },
    });
    expect(verdictFor(messy).keyPoints.length).toBeLessThanOrEqual(3);
  });
});

describe("verdicts du jeu de test", () => {
  const expected: Record<string, string> = {
    "01-plomberie-chauffe-eau": "ok",
    "02-garage-freins": "alert",
    "03-electricite-tableau": "ok",
    // Erreurs de calcul qui coûtent moins de 20 €, SIRET absent (point d'attention) : à négocier.
    "04-serrurerie-urgence": "negotiate",
    "05-chauffage-pac-domicile": "negotiate",
  };

  it.each(Object.entries(expected))("%s : %s", (id, verdict) => {
    const fixture = quoteFixtures.find((item) => item.id === id);
    if (!fixture) throw new Error(`${id} introuvable`);
    const result = verdictFor(expectedExtraction(fixture));
    expect(result.verdict).toBe(verdict);
    if (id.startsWith("02")) {
      expect(result.savings).toEqual({ low: 21, high: 21 });
      expect(result.keyPoints[0]).toBe("Les erreurs de calcul vous font payer 20,80 € de trop.");
    }
  });
});
