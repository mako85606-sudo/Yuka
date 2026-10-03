"use client";

import { motion, type Transition } from "motion/react";
import { useMotionPrefs } from "@/components/motion/MotionPreferences";
import { cn } from "@/lib/cn";
import { formatAmount, formatEuros, formatRate } from "@/lib/format";
import { reducedFade, transitions } from "@/lib/motion";
import type { SceneTotals } from "@/lib/scene-quote";

interface QuoteTotalsProps {
  readonly totals: SceneTotals;
  readonly vatRate: number;
  /** Faux : les totaux attendent, invisibles (leur place est déjà réservée). */
  readonly revealed?: boolean;
  /** Délai d'apparition, en secondes, compté depuis la révélation. */
  readonly delay?: number;
  /** Version resserrée, pour la démo de la landing. */
  readonly compact?: boolean;
}

/** Bas de devis : totaux tels qu'écrits, alignés à droite, chiffres tabulaires. */
export function QuoteTotals({
  totals,
  vatRate,
  revealed = true,
  delay = 0,
  compact = false,
}: QuoteTotalsProps) {
  const { reduced } = useMotionPrefs();
  const transition: Transition = reduced
    ? { ...reducedFade(delay), layout: { duration: 0 } }
    : { ...transitions.lineReveal(delay), layout: transitions.reflow };

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
        <dd className="text-right">{formatAmount(totals.totalHT)}</dd>
        <dt className="text-ink-muted">TVA {formatRate(vatRate)}</dt>
        <dd className="text-right">{formatAmount(totals.totalVAT)}</dd>
        <dt className="pt-1 font-semibold">Total TTC</dt>
        <dd className="pt-1 text-right font-semibold">{formatEuros(totals.totalTTC)}</dd>
      </dl>
    </motion.div>
  );
}
