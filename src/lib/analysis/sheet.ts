import { CATEGORY_LABELS } from "@/config/taxonomy";
import type { LiveLine } from "@/lib/analysis/live-state";
import { commonVatRate, printedLine, printedTotals } from "@/lib/analysis/printed";
import type { Finding, PriceOpinion } from "@/lib/analysis/result";
import { departmentLabel } from "@/lib/department";
import type { ExtractionHeader } from "@/lib/extraction/progress";
import type { Extraction } from "@/lib/extraction/schema";
import type {
  CorrectionQuote,
  IssueSeverity,
  RemarkTone,
  SceneIssue,
  ScenePrice,
  SheetRemark,
  TotalIssue,
  TotalRow,
  Verdict,
} from "@/lib/scene-quote";
import { fr } from "@/lib/typography";

/**
 * De l'analyse réelle à la feuille corrigée : chaque constat trouve sa place.
 * Sur une ligne (calcul faux, ligne vague) : surligneur, cercle, note de marge.
 * Sur un total : même geste, sur le total. Sur le devis entier (mention
 * absente, acompte, TVA, rétractation) : une remarque en bas de la feuille.
 * Un constat sur des chiffres mal lus n'est jamais entouré : il est « à vérifier ».
 */

export interface SheetSource {
  /** Identifiant stable de l'analyse (tracé du tampon). */
  readonly id: string;
  readonly header: ExtractionHeader | null;
  /** Lignes lues jusqu'ici, dans l'ordre du devis. */
  readonly lines: readonly LiveLine[];
  /** Lecture complète et validée, une fois arrivée. */
  readonly extraction: Extraction | null;
  readonly findings: readonly Finding[] | null;
  readonly prices: readonly PriceOpinion[] | null;
  readonly verdict: Verdict | null;
  readonly correctedAt: Date | null;
}

const TOTAL_ROWS: Partial<Record<Finding["ruleId"], TotalRow>> = {
  "total-ht": "totalHT",
  "total-vat": "totalVAT",
  "total-ttc": "totalTTC",
};

const SEVERITY_RANK: Record<IssueSeverity, number> = { error: 0, warning: 1, unconfirmed: 2 };

function severityOf(finding: Finding): IssueSeverity {
  if (!finding.confirmed) return "unconfirmed";
  return finding.kind === "error" ? "error" : "warning";
}

function toneOf(finding: Finding): RemarkTone {
  return finding.kind === "reminder" ? "reminder" : severityOf(finding);
}

/** Note manuscrite : celle d'un constat à confirmer le dit d'emblée. */
function noteOf(finding: Finding): string {
  return finding.confirmed || finding.kind === "reminder" ? finding.note : fr(`À vérifier : ${finding.note}`);
}

export function lineId(index: number): string {
  return `ligne-${index + 1}`;
}

/** Les constats d'une même ligne se partagent un seul geste : le plus grave décide du trait. */
function lineIssues(findings: readonly Finding[]): SceneIssue[] {
  const byLine = new Map<number, Finding[]>();
  for (const finding of findings) {
    if (finding.lineIndex === undefined || finding.kind === "reminder") continue;
    byLine.set(finding.lineIndex, [...(byLine.get(finding.lineIndex) ?? []), finding]);
  }
  return [...byLine.entries()]
    .sort(([a], [b]) => a - b)
    .map(([index, group]) => {
      const sorted = [...group].sort((a, b) => SEVERITY_RANK[severityOf(a)] - SEVERITY_RANK[severityOf(b)]);
      const first = sorted[0]!;
      return {
        id: first.id,
        kind: sorted.some((finding) => finding.ruleId === "line-calculation") ? "calculation" : "vague-line",
        lineId: lineId(index),
        note: sorted.map(noteOf).join(" · "),
        detail: sorted.map((finding) => finding.detail).join(" "),
        severity: severityOf(first),
      } satisfies SceneIssue;
    });
}

function totalIssues(findings: readonly Finding[]): TotalIssue[] {
  return findings.flatMap((finding) => {
    const row = TOTAL_ROWS[finding.ruleId];
    return row
      ? [{ id: finding.id, row, note: noteOf(finding), detail: finding.detail, severity: severityOf(finding) }]
      : [];
  });
}

const TONE_ORDER: Record<RemarkTone, number> = { error: 0, warning: 1, unconfirmed: 2, reminder: 3 };

function remarks(findings: readonly Finding[]): SheetRemark[] {
  return findings
    .filter((finding) => finding.lineIndex === undefined && !TOTAL_ROWS[finding.ruleId])
    // L'étiquette de la remarque dit déjà « à vérifier » : la note reste nue.
    .map((finding) => ({ id: finding.id, tone: toneOf(finding), note: finding.note, detail: finding.detail }))
    .sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone]);
}

function scenePrices(prices: readonly PriceOpinion[]): ScenePrice[] {
  return prices.map((opinion) => ({ lineId: lineId(opinion.lineIndex), delta: opinion.delta, source: opinion.source }));
}

/** Date imprimée (« 2026-09-14 ») ; midi UTC pour rester le même jour à Paris. */
function quoteDate(value: string | undefined): Date | null {
  return value ? new Date(`${value}T12:00:00Z`) : null;
}

export function sheetFromAnalysis(source: SheetSource): CorrectionQuote {
  const { header, extraction } = source;
  const lines = extraction ? extraction.lines.map((line, index) => ({ index, line })) : source.lines;
  const findings = source.findings ?? [];
  return {
    id: source.id,
    category: header ? CATEGORY_LABELS[header.category] : null,
    department: header?.department ? departmentLabel(header.department) : null,
    title: header ? fr(header.subject) : null,
    issuedAt: quoteDate(header?.quoteDate),
    validityDays: header?.validityDays ?? null,
    vatRate: extraction ? commonVatRate(extraction.lines) : null,
    lines: lines.map(printedLine),
    totals: extraction ? printedTotals(extraction.totals) : null,
    issues: lineIssues(findings),
    totalIssues: totalIssues(findings),
    remarks: remarks(findings),
    prices: scenePrices(source.prices ?? []),
    verdict: source.verdict,
    correctedAt: source.correctedAt,
  };
}
