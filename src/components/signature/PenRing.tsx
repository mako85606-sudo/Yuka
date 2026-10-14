import { useId } from "react";
import { cn } from "@/lib/cn";
import { penRing, RING_BOXES, ringVariant, type RingShape } from "@/lib/hand-drawn";
import { cssGesture, durations, easings } from "@/lib/motion";

interface PenRingProps {
  /**
   * `static` : déjà tracé (logo, lien de la page en cours).
   * `hover` : se trace au survol ou au focus du parent `.group` (boutons secondaires, liens).
   * `view` : se trace au défilement, quand la cible passe à l'écran (mots clés).
   */
  readonly mode?: "static" | "hover" | "view";
  /** Fixe la variante (parmi quatre) ; sans graine, chaque anneau prend la sienne. */
  readonly seed?: string;
  /** `word` pour un mot, `wide` pour une cible plus allongée (bouton, expression). */
  readonly shape?: RingShape;
  /** Position autour de la cible et encre. */
  readonly className?: string;
}

/**
 * Le cercle du logo, devenu motif : un anneau au stylo, imparfait, à largeur
 * variable, qui déborde un peu en se refermant. Quatre variantes tournent
 * d'une cible à l'autre. À placer dans un parent `relative`. Décoratif.
 */
export function PenRing({ mode = "static", seed, shape = "word", className }: PenRingProps) {
  const id = useId();
  const maskId = `anneau-${id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const stroke = penRing(ringVariant(seed ?? id), shape);
  const box = RING_BOXES[shape];
  const margin = stroke.maskWidth;
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${box.width} ${box.height}`}
      preserveAspectRatio="none"
      className={cn("pointer-events-none absolute -inset-x-[0.5em] -inset-y-[0.4em] overflow-visible text-pen-red", className)}
    >
      <defs>
        <mask
          id={maskId}
          maskUnits="userSpaceOnUse"
          x={-margin}
          y={-margin}
          width={box.width + 2 * margin}
          height={box.height + 2 * margin}
        >
          <path
            d={stroke.centerline}
            pathLength={1}
            fill="none"
            stroke="white"
            strokeWidth={stroke.maskWidth}
            strokeLinejoin="round"
            className={mode === "hover" ? "ring-hover" : mode === "view" ? "ring-view" : undefined}
            style={mode === "hover" ? cssGesture({ start: 0, duration: durations.circle, ease: easings.out }) : undefined}
          />
        </mask>
      </defs>
      <path d={stroke.outline} fill="currentColor" mask={`url(#${maskId})`} />
    </svg>
  );
}
