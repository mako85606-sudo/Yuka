"use client";

import { motion } from "motion/react";
import { useMemo, type ReactNode } from "react";
import { useMotionPrefs } from "@/components/motion/MotionPreferences";
import { cn } from "@/lib/cn";
import { connectorPath } from "@/lib/hand-drawn";
import { beats, durations, offsets, reducedFade, transitions } from "@/lib/motion";

type Placement = "margin" | "below" | "auto";

interface MarginNoteProps {
  /** Identifiant de la ligne annotée : il fixe la courbe du trait. */
  readonly id: string;
  readonly children: ReactNode;
  /** Faux : la note attend, invisible. Vrai : elle apparaît (après `delay`). */
  readonly active?: boolean;
  /** Délai avant l'apparition, en secondes, compté depuis l'activation. */
  readonly delay?: number;
  /**
   * `margin` : dans la marge de droite, le trait part vers la gauche.
   * `below` : sous la ligne, le trait remonte vers elle.
   * `auto` : sous la ligne sur mobile, dans la marge dès 640 px.
   */
  readonly placement?: Placement;
  /**
   * Explication complète lue par les lecteurs d'écran à la place de la note
   * manuscrite, souvent elliptique (« 4 × 65 = 260, pas 280 »).
   */
  readonly srText?: string;
  readonly className?: string;
}

/** Repères des deux traits (en px), calés sur l'espacement de la marge. */
const MARGIN_LINK = { width: 28, height: 20, from: { x: 25, y: 12 }, to: { x: 3, y: 6 } } as const;
const BELOW_LINK = { width: 22, height: 20, from: { x: 19, y: 17 }, to: { x: 5, y: 3 } } as const;

/**
 * Note manuscrite bleue, reliée à sa ligne par un trait courbe. Le texte est
 * du vrai texte : c'est lui qui explique le problème aux lecteurs d'écran.
 */
export function MarginNote({
  id,
  children,
  active = true,
  delay = 0,
  placement = "auto",
  srText,
  className,
}: MarginNoteProps) {
  const { reduced } = useMotionPrefs();

  return (
    <motion.div
      aria-hidden={active ? undefined : true}
      className={cn(
        "relative font-hand text-hand text-annotation-blue",
        placement === "below" && "pl-6",
        placement === "auto" && "pl-6 sm:pl-0",
        className,
      )}
      initial={{ opacity: 0, x: offsets.noteShiftX }}
      animate={active ? { opacity: 1, x: 0 } : { opacity: 0, x: offsets.noteShiftX }}
      transition={reduced ? reducedFade(delay) : transitions.note(delay)}
    >
      {placement !== "below" ? (
        <Link
          seed={id}
          geometry={MARGIN_LINK}
          bend={-1}
          active={active}
          delay={delay}
          reduced={reduced}
          className={cn("right-full top-0", placement === "auto" ? "hidden sm:block" : "block")}
        />
      ) : null}
      {placement !== "margin" ? (
        <Link
          seed={id}
          geometry={BELOW_LINK}
          bend={1}
          active={active}
          delay={delay}
          reduced={reduced}
          className={cn("-top-3.5 left-0.5", placement === "auto" ? "block sm:hidden" : "block")}
        />
      ) : null}
      <p className="relative" aria-hidden={srText ? true : undefined}>
        {children}
      </p>
      {srText ? <p className="sr-only">{srText}</p> : null}
    </motion.div>
  );
}

interface LinkProps {
  readonly seed: string;
  readonly geometry: typeof MARGIN_LINK | typeof BELOW_LINK;
  readonly bend: 1 | -1;
  readonly active: boolean;
  readonly delay: number;
  readonly reduced: boolean;
  readonly className: string;
}

/** Le trait se dessine, puis sa pointe apparaît quand il arrive à la ligne. */
function Link({ seed, geometry, bend, active, delay, reduced, className }: LinkProps) {
  const { d, arrow } = useMemo(
    () => connectorPath(seed, geometry.from, geometry.to, bend),
    [seed, geometry, bend],
  );
  const arrowDelay = delay + durations.note * beats.noteArrow;

  return (
    <svg
      aria-hidden
      className={cn("pointer-events-none absolute overflow-visible", className)}
      width={geometry.width}
      height={geometry.height}
      viewBox={`0 0 ${geometry.width} ${geometry.height}`}
      fill="none"
    >
      <motion.path
        d={d}
        className="stroke-annotation-blue"
        strokeWidth={1.5}
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: active ? 1 : 0 }}
        transition={reduced ? reducedFade(delay) : transitions.note(delay)}
      />
      <motion.path
        d={arrow}
        className="stroke-annotation-blue"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ opacity: 0 }}
        animate={{ opacity: active ? 1 : 0 }}
        transition={reduced ? reducedFade(delay) : transitions.fadeIn(arrowDelay)}
      />
    </svg>
  );
}
