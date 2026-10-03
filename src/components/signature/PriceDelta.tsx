"use client";

import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect } from "react";
import { useMotionPrefs } from "@/components/motion/MotionPreferences";
import { cn } from "@/lib/cn";
import { formatSignedEuros } from "@/lib/format";
import { reducedFade, transitions } from "@/lib/motion";
import { describeDelta, describeSource, type PriceSource } from "@/lib/price-wording";

interface PriceDeltaProps {
  /** Écart en euros : positif au-dessus de la référence, négatif en dessous. */
  readonly amount: number;
  /** Base Loupe (avec le nombre de devis comparables) ou estimation IA. */
  readonly source: PriceSource;
  /** Délai avant le compteur, en secondes. */
  readonly delay?: number;
  readonly className?: string;
}

/**
 * Avis de prix : « +340 € au-dessus de la médiane », avec un compteur animé
 * (600 ms au plus) et, toujours, sa source et son niveau de confiance.
 *
 * Volontairement distinct des erreurs vérifiées : pas d'encre rouge ici.
 * Orange au-dessus de la référence (il y a matière à négocier), vert en
 * dessous ; une estimation IA reste à l'encre neutre, soulignée en pointillé.
 */
export function PriceDelta({ amount, source, delay = 0, className }: PriceDeltaProps) {
  const { reduced, skip } = useMotionPrefs();
  const counter = useMotionValue(0);
  const shown = useTransform(counter, (latest) => formatSignedEuros(latest));
  const finalText = formatSignedEuros(amount);
  const phrase = describeDelta(amount, source);
  const caption = describeSource(source);
  const rounded = Math.round(amount);
  const tone =
    source.kind === "ai"
      ? "text-ink"
      : rounded > 0
        ? "text-stamp-orange-strong"
        : rounded < 0
          ? "text-stamp-green-strong"
          : "text-ink-muted";

  useEffect(() => {
    if (reduced || skip) {
      counter.jump(amount);
      return;
    }
    counter.jump(0);
    const controls = animate(counter, amount, transitions.counter(delay));
    return () => controls.stop();
  }, [amount, delay, reduced, skip, counter]);

  return (
    <motion.div
      className={cn("text-sm leading-snug", className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={reduced ? reducedFade(delay) : transitions.fadeIn(delay)}
    >
      <p className="sr-only">{`${finalText} ${phrase} (${caption.toLowerCase()})`}</p>
      <p aria-hidden className="flex flex-wrap items-baseline gap-x-2">
        <motion.span
          className={cn(
            "inline-block text-right font-mono text-[1.15rem] font-semibold tabular-nums",
            tone,
            source.kind === "ai" && "underline decoration-dotted decoration-1 underline-offset-4",
          )}
          style={{ minWidth: `${finalText.length}ch` }}
        >
          {shown}
        </motion.span>
        <span className="text-ink">{phrase}</span>
      </p>
      <p aria-hidden className="mt-1 font-mono text-label uppercase text-ink-muted">
        {caption}
      </p>
    </motion.div>
  );
}
