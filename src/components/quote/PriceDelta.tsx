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
  /** Faux : l'avis attend, invisible. Vrai : il apparaît et compte (après `delay`). */
  readonly active?: boolean;
  /** Délai avant le compteur, en secondes, compté depuis l'activation. */
  readonly delay?: number;
  /** `sm` dans une feuille compacte. */
  readonly size?: "md" | "sm";
  readonly className?: string;
}

/**
 * Avis de prix : « +340 € au-dessus de la médiane », avec un compteur animé
 * (600 ms au plus) et, toujours, sa source et son niveau de confiance.
 *
 * Volontairement distinct des erreurs vérifiées : jamais de rouge ici.
 * Orange au-dessus de la référence (il y a matière à négocier), encre
 * neutre en dessous ; une estimation IA reste à l'encre neutre, soulignée en
 * pointillé.
 */
export function PriceDelta({
  amount,
  source,
  active = true,
  delay = 0,
  size = "md",
  className,
}: PriceDeltaProps) {
  const { reduced, skip } = useMotionPrefs();
  // La vraie valeur dès le rendu serveur : le compteur ne repart de zéro que pour s'animer.
  const counter = useMotionValue(amount);
  const shown = useTransform(counter, (latest) => formatSignedEuros(latest));
  const finalText = formatSignedEuros(amount);
  const phrase = describeDelta(amount, source);
  const caption = describeSource(source);
  const rounded = Math.round(amount);
  // Dans la fourchette d'une estimation IA, il n'y a pas d'écart à compter : la phrase suffit.
  const inRange = source.kind === "ai" && rounded === 0;
  const tone =
    source.kind === "ai"
      ? "text-ink"
      : rounded > 0
        ? "text-stamp-orange-strong"
        : "text-ink";

  useEffect(() => {
    if (!active) return;
    if (reduced || skip) {
      // Même chemin que l'animation, sans durée : un saut direct n'était pas toujours affiché
      // quand l'avis apparaissait déjà actif (carte montée à l'approche, mouvement réduit).
      const controls = animate(counter, amount, { duration: 0 });
      return () => controls.stop();
    }
    counter.jump(0);
    const controls = animate(counter, amount, transitions.counter(delay));
    return () => controls.stop();
  }, [active, amount, delay, reduced, skip, counter]);

  return (
    <motion.div
      aria-hidden={active ? undefined : true}
      // Marquage lisible par une machine d'un contenu produit par l'IA (règlement européen sur l'IA, art. 50).
      data-ai-generated={source.kind === "ai" ? "true" : undefined}
      data-price-source={source.kind}
      className={cn(size === "sm" ? "text-[0.8125rem] leading-snug" : "text-sm leading-snug", className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: active ? 1 : 0 }}
      transition={reduced ? reducedFade(delay) : transitions.fadeIn(delay)}
    >
      <p className="sr-only">
        {inRange ? `Prix ${phrase} (${caption.toLowerCase()})` : `${finalText} ${phrase} (${caption.toLowerCase()})`}
      </p>
      <p aria-hidden className="flex flex-wrap items-baseline gap-x-2">
        {inRange ? null : (
          <motion.span
            className={cn(
              "inline-block text-right font-semibold tabular-nums",
              size === "sm" ? "text-[0.9375rem]" : "text-base",
              tone,
              source.kind === "ai" && "underline decoration-dotted decoration-1 underline-offset-4",
            )}
            style={{ minWidth: `${finalText.length}ch` }}
          >
            {shown}
          </motion.span>
        )}
        <span className="text-ink">{inRange ? `${phrase.charAt(0).toUpperCase()}${phrase.slice(1)}` : phrase}</span>
      </p>
      <p aria-hidden className="mt-0.5 text-xs text-ink-muted">
        {caption}
      </p>
    </motion.div>
  );
}
