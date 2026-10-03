"use client";

import { motion } from "motion/react";
import { useMemo } from "react";
import { useMotionPrefs } from "@/components/motion/MotionPreferences";
import { cn } from "@/lib/cn";
import { HIGHLIGHTER_VIEWBOX, highlighterShape } from "@/lib/hand-drawn";
import { reducedFade, transitions } from "@/lib/motion";

interface HighlighterMarkProps {
  /** Identifiant de la ligne : il fixe la forme du trait. */
  readonly id: string;
  /** Faux : le trait attend, invisible. Vrai : il balaie la ligne (après `delay`). */
  readonly active?: boolean;
  /** Délai avant le coup de surligneur, en secondes, compté depuis l'activation. */
  readonly delay?: number;
  readonly className?: string;
}

/**
 * Coup de surligneur jaune derrière la ligne, aux bords irréguliers. Il balaie
 * la ligne de gauche à droite (scaleX depuis la gauche).
 *
 * À placer dans un parent `relative isolate` pour passer derrière le texte
 * sans passer sous la feuille. Décoratif : le texte reste lisible dessus
 * (contraste vérifié dans les deux thèmes).
 */
export function HighlighterMark({ id, active = true, delay = 0, className }: HighlighterMarkProps) {
  const { reduced } = useMotionPrefs();
  const shape = useMemo(() => highlighterShape(id), [id]);

  return (
    <motion.span
      aria-hidden
      className={cn("pointer-events-none absolute -inset-x-1.5 -inset-y-0.5 -z-10 block", className)}
      style={{ originX: 0 }}
      initial={{ scaleX: 0, opacity: 0 }}
      animate={active ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0 }}
      transition={reduced ? reducedFade(delay) : transitions.highlight(delay)}
    >
      <svg
        className="block h-full w-full"
        viewBox={`0 0 ${HIGHLIGHTER_VIEWBOX.width} ${HIGHLIGHTER_VIEWBOX.height}`}
        preserveAspectRatio="none"
      >
        <path d={shape} className="fill-highlighter-mark" />
      </svg>
    </motion.span>
  );
}
