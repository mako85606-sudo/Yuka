"use client";

import { motion, type Transition } from "motion/react";
import { useMotionPrefs } from "@/components/motion/MotionPreferences";
import { HighlighterMark } from "@/components/signature/HighlighterMark";
import { MarginNote } from "@/components/signature/MarginNote";
import { PriceDelta } from "@/components/signature/PriceDelta";
import { RedCircle } from "@/components/signature/RedCircle";
import type { IssueBeats } from "@/lib/choreography";
import { formatAmount, formatQuantity } from "@/lib/format";
import { offsets, reducedFade, transitions } from "@/lib/motion";
import type { PriceSource } from "@/lib/price-wording";

export interface QuoteLineData {
  readonly id: string;
  readonly label: string;
  readonly quantity: number;
  readonly unit: string;
  readonly unitPriceHT: number;
  readonly totalHT: number;
}

export interface QuoteLineIssue {
  readonly id: string;
  readonly note: string;
  readonly detail: string;
  readonly beats: IssueBeats;
}

export interface QuoteLinePrice {
  readonly delta: number;
  readonly source: PriceSource;
  readonly delay: number;
}

interface QuoteLineProps {
  readonly line: QuoteLineData;
  /** Délai d'apparition de la ligne, en secondes. */
  readonly delay?: number;
  /** Problème vérifié : surligneur, cercle rouge, note de marge. */
  readonly issue?: QuoteLineIssue;
  /** Avis de prix, affiché dans la marge, sans encre rouge. */
  readonly price?: QuoteLinePrice;
}

/**
 * Une ligne du devis reconstruit : désignation et montant HT sur la ligne
 * principale, quantité × prix unitaire dessous. Les annotations vont dans la
 * marge à partir de 640 px (largeur `--margin-col`, définie par la feuille),
 * sous la ligne sur mobile. Quand une annotation s'insère au-dessus, la ligne
 * glisse à sa nouvelle place au lieu de sauter.
 */
export function QuoteLine({ line, delay = 0, issue, price }: QuoteLineProps) {
  const { reduced } = useMotionPrefs();
  const transition: Transition = reduced
    ? { ...reducedFade(delay), layout: { duration: 0 } }
    : { ...transitions.lineReveal(delay), layout: transitions.reflow };

  return (
    <motion.li
      layout="position"
      className="grid grid-cols-1 gap-y-2 py-3 sm:grid-cols-[minmax(0,1fr)_var(--margin-col)] sm:gap-x-7"
      initial={{ opacity: 0, y: offsets.lineRiseY }}
      animate={{ opacity: 1, y: 0 }}
      transition={transition}
    >
      <div className="relative">
        {issue ? <RedCircle id={issue.id} delay={issue.beats.circle.start} /> : null}
        <div className="relative isolate flex items-baseline gap-3">
          {issue ? <HighlighterMark id={issue.id} delay={issue.beats.highlight.start} /> : null}
          <span className="min-w-0 flex-1 text-[0.95rem] leading-snug">{line.label}</span>
          <span className="shrink-0 font-mono text-[0.95rem] tabular-nums">
            {formatAmount(line.totalHT)}
          </span>
        </div>
        <p className="mt-0.5 font-mono text-xs tabular-nums text-ink-muted">
          {formatQuantity(line.quantity)} {line.unit} × {formatAmount(line.unitPriceHT)}
        </p>
      </div>

      {issue || price ? (
        <div className="min-w-0 space-y-3">
          {issue ? (
            <MarginNote id={issue.id} delay={issue.beats.note.start} srText={issue.detail}>
              {issue.note}
            </MarginNote>
          ) : null}
          {price ? (
            <PriceDelta
              amount={price.delta}
              source={price.source}
              delay={price.delay}
              className="pl-6 sm:pl-0"
            />
          ) : null}
        </div>
      ) : null}
    </motion.li>
  );
}
