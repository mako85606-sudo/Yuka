import { describe, expect, it } from "vitest";
import { extractionSchema } from "@/lib/extraction/schema";
import { roundCents } from "@/lib/scene-quote";
import {
  expectedDepartment,
  expectedExtraction,
  quoteFixtures,
  type KnownIssue,
} from "@/fixtures/quotes/definitions";

/**
 * Les devis de test doivent être honnêtes : chaque erreur annoncée existe
 * vraiment dans les chiffres imprimés, et rien d'autre n'est faux.
 */

const close = (a: number, b: number) => Math.abs(a - b) <= 0.01;

function issuesOf<K extends KnownIssue["kind"]>(issues: readonly KnownIssue[], kind: K) {
  return issues.filter((issue): issue is Extract<KnownIssue, { kind: K }> => issue.kind === kind);
}

describe.each(quoteFixtures.map((fixture) => [fixture.id, fixture] as const))("%s", (_id, fixture) => {
  const { lines, totals, knownIssues } = fixture;

  it("a une vérité terrain conforme au schéma d'extraction", () => {
    expect(extractionSchema.safeParse(expectedExtraction(fixture)).success).toBe(true);
  });

  it("annonce exactement les lignes mal calculées", () => {
    const wrong = issuesOf(knownIssues, "line-calculation");
    lines.forEach((line, index) => {
      const expected = roundCents(line.quantity * line.unitPriceHT);
      const issue = wrong.find((item) => item.line === index + 1);
      if (issue) {
        expect(close(issue.expected, expected)).toBe(true);
        expect(issue.printed).toBe(line.totalHT);
        expect(close(line.totalHT, expected)).toBe(false);
      } else {
        expect(close(line.totalHT, expected)).toBe(true);
      }
    });
  });

  it("annonce un total HT faux seulement s'il l'est", () => {
    const sum = roundCents(lines.reduce((total, line) => total + line.totalHT, 0));
    const [issue] = issuesOf(knownIssues, "total-ht");
    if (issue) {
      expect(issue).toMatchObject({ expected: sum, printed: totals.totalHT });
      expect(close(sum, totals.totalHT)).toBe(false);
    } else {
      expect(close(sum, totals.totalHT)).toBe(true);
    }
  });

  it("a une TVA juste et annonce un total TTC faux seulement s'il l'est", () => {
    expect(close(roundCents((totals.totalHT * fixture.vatRate) / 100), totals.totalVAT)).toBe(true);
    const expected = roundCents(totals.totalHT + totals.totalVAT);
    const [issue] = issuesOf(knownIssues, "total-ttc");
    if (issue) {
      expect(issue).toMatchObject({ expected, printed: totals.totalTTC });
      expect(close(expected, totals.totalTTC)).toBe(false);
    } else {
      expect(close(expected, totals.totalTTC)).toBe(true);
    }
  });

  it("annonce les mentions absentes, et seulement elles", () => {
    const missing = new Set(issuesOf(knownIssues, "missing-mention").map((issue) => issue.mention));
    const { issuer } = expectedExtraction(fixture);
    for (const mention of ["hasSiret", "hasValidityDate", "hasAddress"] as const) {
      expect(issuer[mention]).toBe(!missing.has(mention));
    }
  });

  it("a un acompte cohérent avec son pourcentage", () => {
    if (fixture.deposit?.percent === undefined) return;
    expect(close(roundCents((totals.totalTTC * fixture.deposit.percent) / 100), fixture.deposit.amount)).toBe(true);
  });

  it("indique un département connu", () => {
    expect(expectedDepartment(fixture)).toMatch(/^\d{2,3}$/);
  });
});

describe("jeu de test", () => {
  it("compte cinq devis à lire, dont deux avec des erreurs connues, et un devis de santé", () => {
    const toRead = quoteFixtures.filter((fixture) => fixture.expectedOutcome === "extracted");
    const withErrors = toRead.filter((fixture) =>
      fixture.knownIssues.some((issue) =>
        ["line-calculation", "total-ht", "total-ttc"].includes(issue.kind),
      ),
    );
    expect(toRead).toHaveLength(5);
    expect(withErrors).toHaveLength(2);
    expect(quoteFixtures.filter((fixture) => fixture.expectedOutcome === "health")).toHaveLength(1);
  });

  it("a des identifiants uniques", () => {
    expect(new Set(quoteFixtures.map((fixture) => fixture.id)).size).toBe(quoteFixtures.length);
  });
});
