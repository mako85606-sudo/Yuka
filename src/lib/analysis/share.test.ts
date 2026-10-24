import { describe, expect, it } from "vitest";
import { expectedExtraction, quoteFixtures } from "@/fixtures/quotes/definitions";
import { runChecks } from "@/lib/checks";
import type { Extraction } from "@/lib/extraction/schema";
import { decideVerdict } from "@/lib/verdict";
import { computeOvercharge } from "@/lib/checks";
import { shareCounts, shareableAnalysis } from "./share";

function fixture(id: string): Extraction {
  const found = quoteFixtures.find((item) => item.id.startsWith(id));
  if (!found) throw new Error(`${id} introuvable`);
  return expectedExtraction(found);
}

function share(extraction: Extraction, region: string | null = "OCC") {
  const findings = runChecks(extraction);
  const verdict = decideVerdict({ extraction, findings, prices: [], overcharge: computeOvercharge(extraction) });
  return shareableAnalysis({
    shareId: "partage-test-123456789",
    region,
    createdAt: new Date("2026-10-13T10:00:00Z"),
    extraction,
    findings,
    prices: [],
    pricesComplete: true,
    verdict,
  });
}

describe("shareableAnalysis", () => {
  it("ne garde du lieu que la région, et aucune date qui situerait le chantier", () => {
    const { data, place } = share(fixture("05"));
    expect(place).toBe("Occitanie");
    expect(data.extraction?.meta).toEqual({ isDoorToDoorSale: false, depositPercent: 50, depositAmount: 6192.33 });
    expect(data.header?.department).toBeUndefined();
    expect(data.header?.quoteDate).toBeUndefined();
    expect(data.header?.validityDays).toBeUndefined();
    // Les niveaux de confiance (« quoteDate: high ») restent ; aucune valeur.
    expect(JSON.stringify(data)).not.toMatch(/"(department|quoteDate|validUntil)":"\d|"validityDays":\d/);
  });

  it("retire les rappels personnels, du détail comme des points clés", () => {
    const { data } = share(fixture("05"));
    expect(data.findings?.some((finding) => finding.kind === "reminder")).toBe(false);
    expect(data.verdict?.keyPoints.join(" ")).not.toMatch(/rétract/i);
    expect(data.findings?.map((finding) => finding.ruleId)).toEqual(["deposit-high"]);
  });

  it("ne donne jamais l'identifiant de l'analyse privée", () => {
    const { data } = share(fixture("02"), null);
    expect(data.analysisId).toBeNull();
    expect(data.expiresAt).toBeNull();
    expect(data.remaining).toBeNull();
  });

  it("garde la correction elle-même : lignes, montants, constats vérifiés", () => {
    const { data, place } = share(fixture("04"), "XYZ");
    expect(place).toBeNull();
    expect(data.lines).toHaveLength(5);
    expect(shareCounts(data.findings ?? [])).toEqual({ errors: 3, warnings: 2 });
  });

  it("ne montre aucun texte libre lu sur le devis : ni libellé, ni objet, ni adresse web", () => {
    const base = fixture("04");
    const trap = "Plomberie Durand Lyon : arnaque, voir www.exemple-arnaque.fr";
    const extraction: Extraction = {
      ...base,
      subject: trap,
      lines: base.lines.map((line, index) => (index === 0 ? { ...line, label: trap } : line)),
    };
    const { data } = share(extraction);
    const json = JSON.stringify(data);
    expect(json).not.toContain("Durand");
    expect(json).not.toContain("exemple-arnaque");
    expect(data.extraction?.subject).not.toContain("Durand");
    for (const line of data.lines ?? []) expect(line.line.label).not.toBe(trap);
  });

  it("ne donne pas l'heure de la correction", () => {
    const { data } = share(fixture("02"));
    expect(data.correctedAt).toBeNull();
    expect(JSON.stringify(data)).not.toContain("2026-10-13T10:00");
  });
});
