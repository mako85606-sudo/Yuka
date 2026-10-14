"use client";

import { motion } from "motion/react";
import { useId, useMemo, useRef } from "react";
import { useMotionPrefs } from "@/components/motion/MotionPreferences";
import { cn } from "@/lib/cn";
import { inkStroke, penLoop } from "@/lib/hand-drawn";
import { reducedFade, transitions } from "@/lib/motion";
import { useElementSize } from "@/lib/use-element-size";

/** Épaisseur du trait, en px : fin quand le stylo se pose et se lève, plein au milieu. */
const PEN_WIDTH = { min: 0.9, max: 2.7 } as const;

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
 * Boucle au stylo rouge autour de sa cible, tracée à la main, d'un trait à
 * largeur variable (le même stylo que la feuille du hero) : un contour
 * rempli, dévoilé par un masque qui parcourt sa ligne médiane.
 *
 * À placer dans un parent `relative` : le composant se mesure lui-même et
 * dessine sa boucle en pixels, pour que l'épaisseur du trait reste la même
 * quelle que soit la largeur de la ligne. Décoratif : l'explication du
 * problème est portée par la note de marge.
 */
export function RedCircle({ id, active = true, delay = 0, className }: RedCircleProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const size = useElementSize(ref);
  const { reduced } = useMotionPrefs();
  const maskId = `boucle-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const stroke = useMemo(() => {
    if (!size || size.width <= 0 || size.height <= 0) return null;
    const loop = penLoop(id, size.width, size.height);
    return { loop, ink: inkStroke(id, loop.points, PEN_WIDTH) };
  }, [id, size]);
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
          <defs>
            <mask
              id={maskId}
              maskUnits="userSpaceOnUse"
              x={-stroke.ink.maskWidth}
              y={-stroke.ink.maskWidth}
              width={size.width + 2 * stroke.ink.maskWidth}
              height={size.height + 2 * stroke.ink.maskWidth}
            >
              <motion.path
                d={stroke.ink.centerline}
                fill="none"
                stroke="white"
                strokeWidth={stroke.ink.maskWidth}
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={active ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
                transition={transition}
              />
            </mask>
          </defs>
          <path d={stroke.ink.outline} className="fill-pen-red" mask={`url(#${maskId})`} />
        </svg>
      ) : null}
    </span>
  );
}
