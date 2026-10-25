import { describe, expect, it } from "vitest";
import { expectedExtraction, quoteFixtures } from "@/fixtures/quotes/definitions";
import { headerFromExtraction } from "@/lib/analysis/live-state";
import { runChecks } from "@/lib/checks";
import type { Extraction } from "@/lib/extraction/schema";
import { aiOpinion } from "@/lib/pricing/opinions";
import { annotationCount } from "@/lib/scene-quote";
import { extractionWith, withLine } from "@/test/extraction";
import { sheetFromAnalysis, type SheetSource } from "./sheet";

function fixture(id: string): Extraction {
  const found = quoteFixtures.find((item) => item.id.startsWith(id));
  if (!found) throw new Error(`${id} introuvable`);
  return expectedExtraction(found);
}

function completed(extraction: Extraction, overrides: Partial<SheetSource> = {}): SheetSource {
  return {
    id: "analyse-test",
    header: headerFromExtraction(extraction),
    lines: [],
    extraction,
    findings: runChecks(extraction),
    prices: [],
    verdict: "alert",
    correctedAt: new Date("2026-10-13T10:00:00Z"),
    ...overrides,
  };
}

describe("sheetFromAnalysis", () => {
  it("reconstruit l'en-tête, les lignes et les totaux lus", () => {
    const sheet = sheetFromAnalysis(completed(fixture("02")));
    expect(sheet).toMatchObject({
      category: "Garage",
      department: "Gironde (33)",
      title: "Remplacement des freins avant",
      validityDays: 15,
      vatRate: 0.2,
      totals: { totalTTC: 502.72 },
      verdict: "alert",
    });
    expect(sheet.issuedAt?.toISOString()).toBe("2026-09-22T12:00:00.000Z");
    expect(sheet.lines.map((line) => line.id)).toEqual(["ligne-1", "ligne-2", "ligne-3", "ligne-4", "ligne-5"]);
  });

  it("met chaque constat à sa place : ligne, total ou remarque", () => {
    const sheet = sheetFromAnalysis(completed(fixture("04")));
    expect(sheet.issues.map((issue) => [issue.lineId, issue.kind, issue.severity])).toEqual([
      ["ligne-2", "calculation", "error"],
      ["ligne-5", "vague-line", "warning"],
    ]);
    expect(sheet.totalIssues?.map((issue) => issue.row)).toEqual(["totalHT"]);
    // Le SIRET absent est un point d'attention : aucun texte lu ne l'exige sur un devis.
    expect(sheet.remarks?.map((remark) => [remark.id, remark.tone])).toEqual([
      ["mention-siret", "warning"],
      ["mention-validity", "warning"],
    ]);
    expect(annotationCount(sheet)).toBe(5);
  });

  it("garde l'acompte, le paiement avant 7 jours et le rappel de rétractation en remarques", () => {
    const sheet = sheetFromAnalysis(completed(fixture("05")));
    expect(sheet.remarks?.map((remark) => [remark.id, remark.tone])).toEqual([
      ["deposit-high", "warning"],
      ["door-to-door-payment", "warning"],
      ["door-to-door", "reminder"],
    ]);
    expect(sheet.remarks?.[2]?.note).toContain("14");
  });

  it("ne présente jamais comme sûr un constat sur des chiffres mal lus", () => {
    const misread = withLine(1, { totalHT: 184, confidence: "low" });
    const sheet = sheetFromAnalysis(completed(misread));
    expect(sheet.issues).toHaveLength(1);
    // La pastille « À vérifier » vient de la sévérité ; la note ne le répète pas.
    expect(sheet.issues[0]).toMatchObject({ severity: "unconfirmed" });
    expect(sheet.issues[0]?.note).not.toMatch(/^À vérifier/);

    const total = sheetFromAnalysis(
      completed(extractionWith({ totals: { totalTTC: 990 }, confidence: { totals: "low" } })),
    );
    expect(total.totalIssues?.[0]).toMatchObject({ row: "totalTTC", severity: "unconfirmed" });
  });

  it("classe à part un point d'attention sur une ligne qui n'est ni un calcul ni une ligne vague", () => {
    const oddVat = withLine(0, { vatRate: 7 });
    const sheet = sheetFromAnalysis(completed(oddVat));
    expect(sheet.issues).toContainEqual(expect.objectContaining({ lineId: "ligne-1", kind: "other", severity: "warning" }));
  });

  it("réunit deux constats sur la même ligne en un seul geste, le plus grave d'abord", () => {
    const both = withLine(0, { label: "Forfait divers", canonicalItem: undefined, totalHT: 700 });
    const sheet = sheetFromAnalysis(completed(both));
    expect(sheet.issues).toHaveLength(1);
    expect(sheet.issues[0]).toMatchObject({ lineId: "ligne-1", kind: "calculation", severity: "error" });
    expect(sheet.issues[0]?.note).toContain(" · ");
  });

  it("place les avis de prix sur leur ligne", () => {
    const opinion = aiOpinion(1, { unit: "heure", unitPrice: 58, quantity: 3 }, { low: 45, high: 52 });
    const sheet = sheetFromAnalysis(completed(fixture("01"), { prices: [opinion] }));
    expect(sheet.prices).toEqual([{ lineId: "ligne-2", delta: 18, source: { kind: "ai" } }]);
  });

  it("pendant la lecture, ne montre que ce qui est arrivé", () => {
    const extraction = fixture("01");
    const reading = sheetFromAnalysis({
      id: "en-cours",
      header: null,
      lines: [{ index: 0, line: extraction.lines[0]! }],
      extraction: null,
      findings: null,
      prices: null,
      verdict: null,
      correctedAt: null,
    });
    expect(reading).toMatchObject({ category: null, title: null, totals: null, verdict: null, issues: [] });
    expect(reading.lines).toHaveLength(1);
  });
});
