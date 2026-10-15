"use client";

import { motion } from "motion/react";
import { useMotionPrefs } from "@/components/motion/MotionPreferences";
import { CheckGlyph, CloseGlyph } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { durations, easings, reducedFade, springs } from "@/lib/motion";
import { SERVER_STEPS, hasReached, type ScenePhase, type ServerStep } from "@/lib/phases";

const LABELS: Record<ServerStep, { readonly short: string; readonly long: string }> = {
  received: { short: "Reçu", long: "Devis reçu" },
  reading: { short: "Lecture", long: "Lecture ligne par ligne" },
  checking: { short: "Contrôles", long: "Calculs et mentions" },
  pricing: { short: "Prix", long: "Comparaison des prix" },
  verdict: { short: "Verdict", long: "Verdict" },
};

export type StepState = "done" | "current" | "failed" | "upcoming" | "unavailable";

interface StepTrackerProps {
  /** Dernière étape atteinte par le serveur. */
  readonly step: ScenePhase;
  /** Vrai tant que le serveur travaille : l'étape atteinte est « en cours ». */
  readonly running: boolean;
  /** Vrai si l'analyse s'est arrêtée sur une erreur, à l'étape atteinte. */
  readonly failed?: boolean;
  /** Étapes que cette version sait faire ; les autres sont annoncées pour bientôt. */
  readonly available?: readonly ServerStep[];
  /** `list` : une étape par ligne, libellés complets ; `bar` : cinq segments côte à côte. */
  readonly layout?: "list" | "bar";
  readonly className?: string;
}

export function stepState(
  target: ServerStep,
  step: ScenePhase,
  running: boolean,
  available: readonly ServerStep[],
  failed = false,
): StepState {
  if (!available.includes(target)) return "unavailable";
  if (step === target) return running ? "current" : failed ? "failed" : "done";
  return hasReached(step, target) ? "done" : "upcoming";
}

const SR_STATES: Record<StepState, string> = {
  done: " : terminé",
  current: " : en cours",
  failed: " : interrompu",
  unavailable: " : bientôt disponible",
  upcoming: " : à venir",
};

/**
 * Où en est l'analyse : une étape par étape réelle du serveur. Une étape ne se
 * coche que lorsque le serveur l'a atteinte, jamais sur un minuteur ; celle en
 * cours tourne doucement (immobile en mouvement réduit).
 */
export function StepTracker({
  step,
  running,
  failed = false,
  available = SERVER_STEPS,
  layout = "list",
  className,
}: StepTrackerProps) {
  return (
    <ol className={cn(layout === "list" ? "space-y-1" : "grid grid-cols-5 gap-2", className)}>
      {SERVER_STEPS.map((target) => {
        const state = stepState(target, step, running, available, failed);
        const muted = state === "upcoming" || state === "unavailable";
        return (
          <li
            key={target}
            className={cn("min-w-0", layout === "list" ? "flex items-center gap-3 py-1.5" : "flex flex-col items-center gap-1.5 text-center")}
          >
            <StepIcon state={state} />
            <span
              className={cn(
                "block min-w-0 truncate",
                layout === "list" ? "text-[0.95rem]" : "text-xs",
                muted ? "text-ink-muted" : state === "failed" ? "text-pen-red-strong" : "text-ink",
                state === "current" && "font-medium",
              )}
            >
              {layout === "list" ? LABELS[target].long : LABELS[target].short}
              <span className="sr-only">{SR_STATES[state]}</span>
              {state === "unavailable" ? (
                <span aria-hidden className="ml-1 text-xs text-ink-muted">
                  (bientôt)
                </span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function StepIcon({ state }: { readonly state: StepState }) {
  const { reduced } = useMotionPrefs();
  const base = "grid size-6 shrink-0 place-items-center rounded-[0.75rem]";
  if (state === "done") {
    return (
      <motion.span
        aria-hidden
        className={cn(base, "bg-brand text-ink")}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={reduced ? reducedFade() : springs.snappy}
      >
        <CheckGlyph className="size-4" />
      </motion.span>
    );
  }
  if (state === "failed") {
    return (
      <span aria-hidden className={cn(base, "bg-error-soft text-pen-red-strong")}>
        <CloseGlyph className="size-3.5" />
      </span>
    );
  }
  if (state === "current") {
    return (
      <motion.span
        aria-hidden
        className={cn(base, "border-2 border-mist border-t-brand")}
        animate={reduced ? { rotate: 0 } : { rotate: 360 }}
        transition={reduced ? { duration: 0 } : { duration: durations.spinner, ease: easings.linear, repeat: Infinity }}
      />
    );
  }
  return <span aria-hidden className={cn(base, "border-2 border-mist")} />;
}
