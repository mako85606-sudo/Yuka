"use client";

import { motion } from "motion/react";
import { useMotionPrefs } from "@/components/motion/MotionPreferences";
import { cn } from "@/lib/cn";
import { reducedFade, transitions } from "@/lib/motion";
import { VERDICT_LABELS, type Verdict } from "@/lib/scene-quote";

const TONES: Record<Verdict, string> = {
  ok: "bg-brand-soft text-brand-strong",
  negotiate: "bg-warning-soft text-stamp-orange-strong",
  alert: "bg-error-soft text-pen-red-strong",
};

const DOTS: Record<Verdict, string> = {
  ok: "bg-verdict-ok",
  negotiate: "bg-verdict-negotiate",
  alert: "bg-verdict-alert",
};

interface VerdictBadgeProps {
  readonly verdict: Verdict;
  /** Faux : la pastille attend, invisible (sa place est réservée). */
  readonly active?: boolean;
  /** Délai d'apparition, en secondes, compté depuis l'activation. */
  readonly delay?: number;
  readonly size?: "md" | "lg";
  readonly className?: string;
}

/** Le verdict en pastille : « Correct », « À négocier », « À vérifier sérieusement ». */
export function VerdictBadge({ verdict, active = true, delay = 0, size = "md", className }: VerdictBadgeProps) {
  const { reduced } = useMotionPrefs();
  return (
    <motion.span
      aria-hidden={active ? undefined : true}
      className={cn(
        "inline-flex items-center gap-2 whitespace-nowrap rounded-md font-semibold",
        size === "lg" ? "px-3.5 py-2 text-base" : "px-2.5 py-1 text-sm",
        TONES[verdict],
        className,
      )}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={active ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
      transition={reduced ? reducedFade(delay) : transitions.stamp(delay)}
    >
      <span aria-hidden className={cn("size-2 rounded-[0.25rem]", DOTS[verdict])} />
      {VERDICT_LABELS[verdict]}
    </motion.span>
  );
}
