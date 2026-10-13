"use client";

import { motion, type Transition } from "motion/react";
import type { ReactNode } from "react";
import { useMotionPrefs } from "@/components/motion/MotionPreferences";
import { HighlighterMark } from "@/components/signature/HighlighterMark";
import { MarginNote } from "@/components/signature/MarginNote";
import { RedCircle } from "@/components/signature/RedCircle";
import type { IssueBeats } from "@/lib/choreography";
import { cn } from "@/lib/cn";
import { formatAmount, formatEuros, formatRate } from "@/lib/format";
import { reducedFade, transitions } from "@/lib/motion";
import type { PrintedTotals, TotalRow } from "@/lib/scene-quote";

/** Problème sur un total, avec son calendrier : même geste qu'une ligne fausse. */
export interface QuoteTotalIssue {
  readonly id: string;
  readonly row: TotalRow;
  readonly note: string;
  readonly detail: string;
  readonly beats: IssueBeats;
  readonly active: boolean;
  /** Faux pour un constat à confirmer : surligné et annoté, jamais entouré. */
  readonly circled: boolean;
}

interface QuoteTotalsProps {
  readonly totals: PrintedTotals;
  /** Taux unique du devis, en fraction (0,1) ; `null` s'il y en a plusieurs ou aucun. */
  readonly vatRate: number | null;
  /** Faux : les totaux attendent, invisibles (leur place est déjà réservée). */
  readonly revealed?: boolean;
  /** Délai d'apparition, en secondes, compté depuis la révélation. */
  readonly delay?: number;
  /** Totaux faux : entourés, avec leur note dans la marge. */
  readonly issues?: readonly QuoteTotalIssue[];
  /** Version resserrée, pour la démo de la landing. */
  readonly compact?: boolean;
}

/** Bas de devis : totaux tels qu'écrits, alignés à droite, chiffres tabulaires. */
export function QuoteTotals({
  totals,
  vatRate,
  revealed = true,
  delay = 0,
  issues = [],
  compact = false,
}: QuoteTotalsProps) {
  const { reduced } = useMotionPrefs();
  const transition: Transition = reduced
    ? { ...reducedFade(delay), layout: { duration: 0 } }
    : { ...transitions.lineReveal(delay), layout: transitions.reflow };
  const issueFor = (row: TotalRow) => issues.find((issue) => issue.row === row);

  return (
    <motion.div
      layout="position"
      className={cn(
        "border-t border-rule sm:grid sm:grid-cols-[minmax(0,1fr)_var(--margin-col)] sm:gap-x-7",
        compact ? "px-5 py-3 sm:px-6" : "px-5 py-4 sm:px-8",
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: revealed ? 1 : 0 }}
      transition={transition}
    >
      <dl
        className={cn(
          "ml-auto grid max-w-72 grid-cols-[1fr_auto] gap-x-6 gap-y-1 font-mono tabular-nums",
          compact ? "text-[0.8125rem]" : "text-sm",
        )}
      >
        <dt className="text-ink-muted">Total HT</dt>
        <dd className="text-right">
          <Marked issue={issueFor("totalHT")}>
            <Amount value={totals.totalHT} format={formatAmount} />
          </Marked>
        </dd>
        <dt className="text-ink-muted">TVA{vatRate === null ? null : ` ${formatRate(vatRate)}`}</dt>
        <dd className="text-right">
          <Marked issue={issueFor("totalVAT")}>
            <Amount value={totals.totalVAT} format={formatAmount} />
          </Marked>
        </dd>
        <dt className="pt-1 font-semibold">Total TTC</dt>
        <dd className="pt-1 text-right font-semibold">
          <Marked issue={issueFor("totalTTC")}>
            <Amount value={totals.totalTTC} format={formatEuros} />
          </Marked>
        </dd>
      </dl>

      {issues.length > 0 ? (
        <div className="mt-4 min-w-0 space-y-3 sm:mt-0">
          {issues.map((issue) => (
            <MarginNote
              key={issue.id}
              id={issue.id}
              active={issue.active}
              delay={issue.beats.note.start}
              srText={issue.detail}
            >
              {issue.note}
            </MarginNote>
          ))}
        </div>
      ) : null}
    </motion.div>
  );
}

/** Le montant d'un total faux : surligné, puis entouré s'il est vérifié. */
function Marked({ issue, children }: { readonly issue: QuoteTotalIssue | undefined; readonly children: ReactNode }) {
  if (!issue) return <>{children}</>;
  return (
    <span className="relative inline-block">
      {issue.circled ? (
        <RedCircle id={issue.id} active={issue.active} delay={issue.beats.circle.start} className="-inset-x-3 -inset-y-2.5" />
      ) : null}
      <span className="relative isolate inline-block">
        <HighlighterMark id={issue.id} active={issue.active} delay={issue.beats.highlight.start} />
        {children}
      </span>
    </span>
  );
}

/** Un montant imprimé, ou un tiret s'il n'y en a pas sur le devis. */
function Amount({
  value,
  format,
}: {
  readonly value: number | null;
  readonly format: (amount: number) => string;
}) {
  if (value !== null) return <>{format(value)}</>;
  return (
    <>
      <span aria-hidden>—</span>
      <span className="sr-only">non indiqué</span>
    </>
  );
}
