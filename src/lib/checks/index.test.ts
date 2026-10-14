import { describe, expect, it } from "vitest";
import { expectedExtraction, quoteFixtures } from "@/fixtures/quotes/definitions";
import { compareFindings } from "@/lib/eval/known-issues";
import { cleanExtraction, extractionWith } from "@/test/extraction";
import { computeOvercharge, runChecks } from "./index";

const toRead = quoteFixtures.filter((fixture) => fixture.expectedOutcome === "extracted");

describe.each(toRead.map((fixture) => [fixture.id, fixture] as const))("jeu de test %s", (_id, fixture) => {
  it("trouve exactement les erreurs volontaires, rien de plus", () => {
    const findings = runChecks(expectedExtraction(fixture));
    const comparison = compareFindings(fixture.knownIssues, findings);
    expect(comparison.missed).toEqual([]);
    expect(comparison.extra).toEqual([]);
    expect(findings).toHaveLength(fixture.knownIssues.length);
    expect(findings.every((finding) => finding.confirmed)).toBe(true);
  });
});

describe("runChecks", () => {
  it("ne trouve rien à redire à un devis propre", () => {
    expect(runChecks(cleanExtraction)).toEqual([]);
  });

  it("donne des identifiants uniques", () => {
    const messy = extractionWith({
      issuer: { hasSiret: false, hasValidityDate: false },
      meta: { depositPercent: 60, isDoorToDoorSale: true },
      totals: { totalTTC: 999 },
    });
    const ids = runChecks(messy).map((finding) => finding.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(5);
  });
});

describe("computeOvercharge", () => {
  it("chiffre ce que les erreurs coûtent au client", () => {
    const garage = quoteFixtures.find((fixture) => fixture.id.startsWith("02"));
    if (!garage) throw new Error("devis 02 introuvable");
    // Ligne gonflée de 9 € (+ 1,80 € de TVA) et TTC gonflé de 10 €.
    expect(computeOvercharge(expectedExtraction(garage))).toBe(20.8);
  });

  it("ne compte rien quand les erreurs ne coûtent rien au client", () => {
    const locksmith = quoteFixtures.find((fixture) => fixture.id.startsWith("04"));
    if (!locksmith) throw new Error("devis 04 introuvable");
    expect(computeOvercharge(expectedExtraction(locksmith))).toBe(0);
    expect(computeOvercharge(cleanExtraction)).toBe(0);
  });

  it("renonce si le devis ne donne pas de quoi tout recalculer", () => {
    expect(computeOvercharge(extractionWith({ lines: [{ label: "A", confidence: "high", totalHT: 10 }] }))).toBeNull();
  });
});
