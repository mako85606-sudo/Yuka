import { checksConfig } from "@/config/checks";
import type { Finding } from "@/lib/analysis/result";
import type { Extraction } from "@/lib/extraction/schema";
import { formatEuros } from "@/lib/format";
import { fr } from "@/lib/typography";
import { isSure } from "./shared";

/** Acompte demandé, en pourcentage du TTC : lu tel quel, ou déduit du montant. */
export function depositPercent(extraction: Extraction): number | undefined {
  const { depositPercent, depositAmount } = extraction.meta;
  if (depositPercent !== undefined) return depositPercent;
  const total = extraction.totals.totalTTC;
  if (depositAmount === undefined || total === undefined || total <= 0) return undefined;
  return Math.round((depositAmount / total) * 1000) / 10;
}

/**
 * Acompte élevé : un avertissement, jamais une accusation. Le seuil est un
 * choix de produit (`src/config/checks.ts`) : aucun texte consulté ne fixe de
 * plafond d'acompte pour ces métiers, et le message n'en invente pas.
 */
export function checkDeposit(extraction: Extraction): Finding[] {
  const percent = depositPercent(extraction);
  if (percent === undefined || percent <= checksConfig.depositWarningPercent) return [];
  const shown = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(percent);
  const amount = extraction.meta.depositAmount;
  return [
    {
      id: "deposit-high",
      ruleId: "deposit-high",
      kind: "warning",
      confirmed: isSure(extraction.confidence.deposit),
      note: fr(`Acompte de ${shown} %`),
      detail: fr(
        `Acompte de ${shown} %${amount !== undefined ? ` (${formatEuros(amount)})` : ""} demandé avant les travaux. Un acompte élevé vous fait avancer une grande partie du prix avant le début du chantier : vous pouvez proposer un acompte plus faible et un paiement au fil des travaux, le solde étant réglé à la fin.`,
      ),
      ruleVerified: true,
    },
  ];
}
