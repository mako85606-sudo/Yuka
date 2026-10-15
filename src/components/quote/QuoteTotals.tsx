"use client";

import { motion, type Transition } from "motion/react";
import { useMotionPrefs } from "@/components/motion/MotionPreferences";
import { Tag, type TagTone } from "@/components/ui/Tag";
import type { IssueBeats } from "@/lib/choreography";
import { cn } from "@/lib/cn";
import { formatAmount, formatEuros, formatRate } from "@/lib/format";
import { offsets, reducedFade, transitions } from "@/lib/motion";
import type { PrintedTotals, TotalRow } from "@/lib/scene-quote";

/** Problème sur un total, avec son calendrier : même geste qu'une ligne fausse. */
export interface QuoteTotalIssue {
  readonly id: string;
  readonly row: TotalRow;
  readonly tag: string;
  readonly tone: TagTone;
  readonly note: string;
  readonly detail: string;
  readonly beats: IssueBeats;
  readonly active: boolean;
}

interface QuoteTotalsProps {
  readonly totals: PrintedTotals;
  /** Taux unique du devis, en fraction (0,1) ; `null` s'il y en a plusieurs ou aucun. */
  readonly vatRate: number | null;
  /** Faux : les totaux attendent, invisibles (leur place est déjà réservée). */
  readonly revealed?: boolean;
  /** Délai d'apparition, en secondes, compté depuis la révélation. */
  readonly delay?: number;
  /** Totaux faux : surlignés, avec leur pastille et leur note. */
  readonly issues?: readonly QuoteTotalIssue[];
  readonly compact?: boolean;
}

const ROWS: readonly { readonly row: TotalRow; readonly strong?: boolean }[] = [
  { row: "totalHT" },
  { row: "totalVAT" },
  { row: "totalTTC", strong: true },
];

/** Bas de devis : totaux tels qu'écrits, alignés à droite, chiffres tabulaires. */
export function QuoteTotals({ totals, vatRate, revealed = true, delay = 0, issues = [], compact = false }: QuoteTotalsProps) {
  const { reduced } = useMotionPrefs();
  const transition: Transition = reduced
    ? { ...reducedFade(delay), layout: { duration: 0 } }
    : { ...transitions.lineReveal(delay), layout: transitions.reflow };
  const label = (row: TotalRow) =>
    row === "totalHT" ? "Total HT" : row === "totalTTC" ? "Total TTC" : `TVA${vatRate === null ? "" : ` ${formatRate(vatRate)}`}`;

  return (
    <motion.div
      layout="position"
      className={cn("border-t border-rule py-2", compact ? "px-5" : "px-5 sm:px-7")}
      initial={{ opacity: 0 }}
      animate={{ opacity: revealed ? 1 : 0 }}
      transition={transition}
    >
      <div>
        {ROWS.map(({ row, strong }) => {
          const issue = issues.find((item) => item.row === row);
          const value = totals[row];
          return (
            <div key={row} className={cn("relative -mx-5 px-5 py-1.5", !compact && "sm:-mx-7 sm:px-7")}>
              {issue ? (
                <motion.span
                  aria-hidden
                  className="absolute inset-0 origin-left bg-highlighter-mark"
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={issue.active ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0 }}
                  transition={reduced ? reducedFade(issue.beats.highlight.start) : transitions.highlight(issue.beats.highlight.start)}
                />
              ) : null}
              <div className={cn("relative flex items-baseline justify-end gap-6 font-mono tabular-nums", strong ? "text-[0.95rem] font-semibold text-ink" : "text-sm")}>
                <span className={strong ? "text-ink" : "text-ink-muted"}>{label(row)}</span>
                <span className="min-w-[7.5rem] text-right">
                  {value === null ? (
                    <>
                      <span aria-hidden>—</span>
                      <span className="sr-only">non indiqué</span>
                    </>
                  ) : row === "totalTTC" ? (
                    formatEuros(value)
                  ) : (
                    formatAmount(value)
                  )}
                </span>
              </div>
              {issue ? (
                <motion.p
                  aria-hidden={issue.active ? undefined : true}
                  className="relative mt-1.5 flex flex-wrap items-center justify-end gap-x-2 gap-y-1"
                  initial={{ opacity: 0, x: offsets.noteShiftX }}
                  animate={issue.active ? { opacity: 1, x: 0 } : { opacity: 0, x: offsets.noteShiftX }}
                  transition={reduced ? reducedFade(issue.beats.circle.start) : transitions.note(issue.beats.circle.start)}
                >
                  <Tag tone={issue.tone}>{issue.tag}</Tag>
                  <span aria-hidden className="text-sm text-ink">
                    {issue.note}
                  </span>
                  <span className="sr-only">{`${issue.tag} : ${issue.detail}`}</span>
                </motion.p>
              ) : null}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
