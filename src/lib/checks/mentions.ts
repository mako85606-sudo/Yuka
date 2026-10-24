import { legalRefFor, MENTION_RULES, type MentionRule } from "@/config/rules";
import type { Finding } from "@/lib/analysis/result";
import type { Extraction } from "@/lib/extraction/schema";
import { fr } from "@/lib/typography";
import { isSure } from "./shared";

function applies(rule: MentionRule, extraction: Extraction): boolean {
  return rule.categories === "all" || rule.categories.includes(extraction.category);
}

function isPresent(rule: MentionRule, extraction: Extraction): boolean {
  return rule.field === "quoteDate"
    ? extraction.meta.quoteDate !== undefined
    : extraction.issuer[rule.field];
}

/**
 * Mentions attendues sur un devis (`src/config/rules.ts`). Le constat est un
 * fait (la mention n'apparaît pas) ; la règle qui l'exige garde sa
 * référence pour ce corps de métier (aucune si aucun texte connu ne la fonde),
 * affichée seulement une fois vérifiée.
 */
export function checkMentions(extraction: Extraction): Finding[] {
  const { confidence } = extraction;
  return MENTION_RULES.filter((rule) => applies(rule, extraction) && !isPresent(rule, extraction)).map(
    (rule): Finding => ({
      id: rule.id,
      ruleId: rule.id,
      kind: rule.severity,
      confirmed: isSure(rule.field === "quoteDate" ? confidence.quoteDate : confidence.issuer),
      note: fr(rule.note),
      detail: fr(rule.message),
      legalRef: legalRefFor(rule, extraction.category),
      ruleVerified: rule.verified,
    }),
  );
}
