"use client";

import { motion } from "motion/react";
import { useMemo, useRef } from "react";
import { useMotionPrefs } from "@/components/motion/MotionPreferences";
import { cn } from "@/lib/cn";
import { penLoop } from "@/lib/hand-drawn";
import { reducedFade, transitions } from "@/lib/motion";
import { useElementSize } from "@/lib/use-element-size";

interface RedCircleProps {
  /** Identifiant de la ligne : il fixe le coup de crayon, identique à chaque rendu. */
  readonly id: string;
  /** Faux : la boucle attend, invisible. Vrai : elle se trace (après `delay`). */
  readonly active?: boolean;
  /** Délai avant de tracer, en secondes, compté depuis l'activation. */
  readonly delay?: number;
  /** Position et débord autour de la cible (par défaut : un peu plus large que la ligne). */
  readonly className?: string;
}

/**
 * Boucle au stylo rouge autour de sa cible, tracée à la main.
 *
 * À placer dans un parent `relative` : le composant se mesure lui-même et
 * dessine sa boucle en pixels, pour que l'épaisseur du trait reste constante
 * quelle que soit la largeur de la ligne. Décoratif : l'explication du
 * problème est portée par la note de marge.
 */
export function RedCircle({ id, active = true, delay = 0, className }: RedCircleProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const size = useElementSize(ref);
  const { reduced } = useMotionPrefs();
  const stroke = useMemo(
    () => (size && size.width > 0 && size.height > 0 ? penLoop(id, size.width, size.height) : null),
    [id, size],
  );
  const transition = reduced ? reducedFade(delay) : transitions.circle(delay);

  return (
    <span
      ref={ref}
      aria-hidden
      className={cn("pointer-events-none absolute -inset-x-3 -inset-y-4 block sm:-inset-x-4", className)}
    >
      {stroke && size ? (
        <svg
          className="absolute inset-0 h-full w-full overflow-visible"
          viewBox={`0 0 ${size.width} ${size.height}`}
          fill="none"
        >
          {/* Le stylo se pose : petit dépôt d'encre au départ du trait. */}
          <motion.circle
            cx={stroke.start.x}
            cy={stroke.start.y}
            r={1.6}
            className="fill-pen-red"
            initial={{ opacity: 0 }}
            animate={{ opacity: active ? 1 : 0 }}
            transition={transition}
          />
          <motion.path
            d={stroke.d}
            className="stroke-pen-red"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={active ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
            transition={transition}
          />
        </svg>
      ) : null}
    </span>
  );
}
