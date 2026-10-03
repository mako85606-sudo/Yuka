"use client";

import { motion, type Transition } from "motion/react";
import { useMotionPrefs } from "@/components/motion/MotionPreferences";
import { formatAmount, formatEuros, formatRate } from "@/lib/format";
import { reducedFade, transitions } from "@/lib/motion";

interface QuoteTotalsProps {
  readonly totalHT: number;
  readonly vatRate: number;
  readonly totalVAT: number;
  readonly totalTTC: number;
  /** Délai d'apparition, en secondes. */
  readonly delay?: number;
}

/** Bas de devis : totaux alignés à droite, chiffres tabulaires. */
export function QuoteTotals({ totalHT, vatRate, totalVAT, totalTTC, delay = 0 }: QuoteTotalsProps) {
  const { reduced } = useMotionPrefs();
  const transition: Transition = reduced
    ? { ...reducedFade(delay), layout: { duration: 0 } }
    : { ...transitions.lineReveal(delay), layout: transitions.reflow };

  return (
    <motion.div
      layout="position"
      className="border-t border-rule px-5 py-4 sm:grid sm:grid-cols-[minmax(0,1fr)_var(--margin-col)] sm:gap-x-7 sm:px-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={transition}
    >
      <dl className="ml-auto grid max-w-72 grid-cols-[1fr_auto] gap-x-6 gap-y-1 font-mono text-sm tabular-nums">
        <dt className="text-ink-muted">Total HT</dt>
        <dd className="text-right">{formatAmount(totalHT)}</dd>
        <dt className="text-ink-muted">TVA {formatRate(vatRate)}</dt>
        <dd className="text-right">{formatAmount(totalVAT)}</dd>
        <dt className="pt-1 font-semibold">Total TTC</dt>
        <dd className="pt-1 text-right font-semibold">{formatEuros(totalTTC)}</dd>
      </dl>
    </motion.div>
  );
}
