import type { KnownIssue } from "@/fixtures/quotes/definitions";
import type { Finding } from "@/lib/analysis/result";

/**
 * Rapproche les constats des vérifications des erreurs volontaires du jeu de
 * test : une même « signature » des deux côtés (règle, et ligne s'il y en a une).
 */

const MENTION_RULES: Record<Extract<KnownIssue, { kind: "missing-mention" }>["mention"], string> = {
  hasCompanyName: "mention-company-name",
  hasSiret: "mention-siret",
  hasAddress: "mention-address",
  hasInsuranceMention: "mention-insurance",
  hasValidityDate: "mention-validity",
  hasTravelFees: "mention-travel-fees",
  hasClientIdentity: "mention-client",
  hasPaymentTerms: "mention-payment-terms",
};

/** Ce qu'un constat doit dire pour correspondre à une erreur volontaire. */
export function issueSignature(issue: KnownIssue): string {
  switch (issue.kind) {
    case "line-calculation":
    case "vague-line":
      return `${issue.kind}:${issue.line - 1}`;
    case "total-ht":
    case "total-ttc":
    case "door-to-door":
      return issue.kind;
    case "high-deposit":
      return "deposit-high";
    case "missing-mention":
      return MENTION_RULES[issue.mention];
  }
}

export function findingSignature(finding: Finding): string {
  return finding.ruleId === "line-calculation" || finding.ruleId === "vague-line"
    ? `${finding.ruleId}:${finding.lineIndex}`
    : finding.ruleId;
}

export interface FindingsComparison {
  /** Erreurs volontaires retrouvées. */
  readonly found: readonly string[];
  /** Erreurs volontaires manquées. */
  readonly missed: readonly string[];
  /** Constats sans erreur volontaire derrière (faux positifs, ou lecture fautive). */
  readonly extra: readonly string[];
}

export function compareFindings(issues: readonly KnownIssue[], findings: readonly Finding[]): FindingsComparison {
  const expected = new Set(issues.map(issueSignature));
  const actual = new Set(findings.map(findingSignature));
  return {
    found: [...expected].filter((signature) => actual.has(signature)),
    missed: [...expected].filter((signature) => !actual.has(signature)),
    extra: [...actual].filter((signature) => !expected.has(signature)),
  };
}
