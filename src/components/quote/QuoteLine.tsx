"use client";

import { motion, type Transition } from "motion/react";
import { useMotionPrefs } from "@/components/motion/MotionPreferences";
import { HighlighterMark } from "@/components/signature/HighlighterMark";
import { MarginNote } from "@/components/signature/MarginNote";
import { PriceDelta } from "@/components/signature/PriceDelta";
import { RedCircle } from "@/components/signature/RedCircle";
import type { IssueBeats } from "@/lib/choreography";
import { cn } from "@/lib/cn";
import { formatAmount, formatQuantity } from "@/lib/format";
import { offsets, reducedFade, transitions } from "@/lib/motion";
import type { PriceSource } from "@/lib/price-wording";
import type { SceneLine } from "@/lib/scene-quote";

export interface QuoteLineIssue {
  readonly id: string;
  readonly note: string;
  readonly detail: string;
  readonly beats: IssueBeats;
  /** Vrai quand l'étape de vérification est atteinte. */
  readonly active: boolean;
}

export interface QuoteLinePrice {
  readonly delta: number;
  readonly source: PriceSource;
  readonly delay: number;
  /** Vrai quand l'étape des prix est atteinte. */
  readonly active: boolean;
}

interface QuoteLineProps {
  readonly line: SceneLine;
  /** Faux : la ligne attend, invisible (sa place est déjà réservée). */
  readonly revealed?: boolean;
  /** Délai d'apparition de la ligne, en secondes, compté depuis la révélation. */
  readonly delay?: number;
  /** Problème vérifié : surligneur, cercle rouge, note de marge. */
  readonly issue?: QuoteLineIssue;
  /** Avis de prix, affiché dans la marge, sans encre rouge. */
  readonly price?: QuoteLinePrice;
  /** Version resserrée, pour la démo de la landing. */
  readonly compact?: boolean;
}

/**
 * Une ligne du devis reconstruit : désignation et montant HT sur la ligne
 * principale, quantité × prix unitaire dessous. Les annotations vont dans la
 * marge à partir de 640 px (largeur `--margin-col`, définie par la feuille),
 * sous la ligne sur mobile. Si une annotation s'insère au-dessus, la ligne
 * glisse à sa nouvelle place au lieu de sauter.
 */
export function QuoteLine({
  line,
  revealed = true,
  delay = 0,
  issue,
  price,
  compact = false,
}: QuoteLineProps) {
  const { reduced } = useMotionPrefs();
  const transition: Transition = reduced
    ? { ...reducedFade(delay), layout: { duration: 0 } }
    : { ...transitions.lineReveal(delay), layout: transitions.reflow };
  const textSize = compact ? "text-[0.875rem]" : "text-[0.95rem]";

  return (
    <motion.li
      layout="position"
      className={cn(
        "grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_var(--margin-col)] sm:gap-x-7",
        compact ? "gap-y-1.5 py-2.5" : "gap-y-2 py-3",
      )}
      initial={{ opacity: 0, y: offsets.lineRiseY }}
      animate={revealed ? { opacity: 1, y: 0 } : { opacity: 0, y: offsets.lineRiseY }}
      transition={transition}
    >
      <div className="relative">
        {issue ? (
          <RedCircle id={issue.id} active={issue.active} delay={issue.beats.circle.start} />
        ) : null}
        <div className="relative isolate flex items-baseline gap-3">
          {issue ? (
            <HighlighterMark
              id={issue.id}
              active={issue.active}
              delay={issue.beats.highlight.start}
            />
          ) : null}
          <span className={cn("min-w-0 flex-1 leading-snug", textSize)}>{line.label}</span>
          <span className={cn("shrink-0 font-mono tabular-nums", textSize)}>
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
            <MarginNote
              id={issue.id}
              active={issue.active}
              delay={issue.beats.note.start}
              srText={issue.detail}
            >
              {issue.note}
            </MarginNote>
          ) : null}
          {price ? (
            <PriceDelta
              amount={price.delta}
              source={price.source}
              active={price.active}
              delay={price.delay}
              size={compact ? "sm" : "md"}
              className="pl-6 sm:pl-0"
            />
          ) : null}
        </div>
      ) : null}
    </motion.li>
  );
}
