import { USUAL_VAT_RATES, VAT_RATES_IN_FORCE } from "@/config/rules";
import { CATEGORY_LABELS } from "@/config/taxonomy";
import type { Finding } from "@/lib/analysis/result";
import type { Extraction } from "@/lib/extraction/schema";
import { formatRate } from "@/lib/format";
import { fr } from "@/lib/typography";
import { isSure } from "./shared";

/** Lignes concernées par chaque taux de TVA lu sur le devis. */
function linesByRate(extraction: Extraction): Map<number, number[]> {
  const byRate = new Map<number, number[]>();
  extraction.lines.forEach((line, index) => {
    if (line.vatRate === undefined) return;
    byRate.set(line.vatRate, [...(byRate.get(line.vatRate) ?? []), index]);
  });
  return byRate;
}

function lineList(indexes: readonly number[]): string {
  const numbers = indexes.map((index) => index + 1);
  return numbers.length === 1 ? `la ligne ${numbers[0]}` : `les lignes ${numbers.join(", ")}`;
}

/** Un taux qui n'existe pas en France (19,6 %, 7 %…). */
export function checkUnknownVatRates(extraction: Extraction): Finding[] {
  const findings: Finding[] = [];
  for (const [rate, indexes] of linesByRate(extraction)) {
    if (VAT_RATES_IN_FORCE.includes(rate)) continue;
    findings.push({
      id: `vat-rate-unknown-${rate}`,
      ruleId: "vat-rate-unknown",
      kind: "warning",
      confirmed: isSure(...indexes.map((index) => extraction.lines[index]?.confidence)),
      lineIndex: indexes.length === 1 ? indexes[0] : undefined,
      note: fr(`TVA à ${formatRate(rate / 100)} ?`),
      detail: fr(
        `TVA à ${formatRate(rate / 100)} sur ${lineList(indexes)} : ce n'est pas un taux en vigueur en France (20 %, 10 %, 5,5 % ou 2,1 %). Demandez une correction.`,
      ),
      ruleVerified: true,
    });
  }
  return findings;
}

/** Un taux réduit là où le corps de métier facture d'ordinaire au taux normal. */
export function checkVatRatesForCategory(extraction: Extraction): Finding[] {
  const usual = USUAL_VAT_RATES[extraction.category];
  const findings: Finding[] = [];
  for (const [rate, indexes] of linesByRate(extraction)) {
    if (!VAT_RATES_IN_FORCE.includes(rate) || usual.includes(rate)) continue;
    findings.push({
      id: `vat-rate-category-${rate}`,
      ruleId: "vat-rate-category",
      kind: "warning",
      confirmed: isSure(...indexes.map((index) => extraction.lines[index]?.confidence)),
      lineIndex: indexes.length === 1 ? indexes[0] : undefined,
      note: fr(`TVA à ${formatRate(rate / 100)} : inhabituel`),
      detail: fr(
        `TVA à ${formatRate(rate / 100)} sur ${lineList(indexes)} : un taux inhabituel pour ce type de devis (${CATEGORY_LABELS[extraction.category].toLowerCase()}). Demandez à l'artisan sur quoi il repose.`,
      ),
      ruleVerified: false,
    });
  }
  return findings;
}
