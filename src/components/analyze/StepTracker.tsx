"use client";

import { motion } from "motion/react";
import { useMotionPrefs } from "@/components/motion/MotionPreferences";
import { cn } from "@/lib/cn";
import { reducedFade, transitions } from "@/lib/motion";
import { SERVER_STEPS, hasReached, type ScenePhase, type ServerStep } from "@/lib/phases";

const LABELS: Record<ServerStep, string> = {
  received: "Reçu",
  reading: "Lecture",
  checking: "Contrôles",
  pricing: "Prix",
  verdict: "Verdict",
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

/**
 * Où en est l'analyse : cinq segments, un par étape réelle du serveur. Une
 * étape ne s'allume que lorsque le serveur l'a atteinte, jamais sur un
 * minuteur ; celle en cours respire doucement.
 */
export function StepTracker({
  step,
  running,
  failed = false,
  available = SERVER_STEPS,
  className,
}: StepTrackerProps) {
  const { reduced } = useMotionPrefs();

  return (
    <ol className={cn("grid grid-cols-5 gap-1.5 sm:gap-2", className)}>
      {SERVER_STEPS.map((target) => {
        const state = stepState(target, step, running, available, failed);
        return (
          <li key={target} className="min-w-0">
            <span className="relative block h-[3px] overflow-hidden rounded-full bg-rule">
              <motion.span
                className={cn(
                  "absolute inset-0 rounded-full",
                  state === "failed" ? "bg-pen-red-strong" : "bg-ink",
                )}
                initial={false}
                animate={
                  state === "current" && !reduced
                    ? { opacity: [0.35, 1] }
                    : { opacity: state === "upcoming" || state === "unavailable" ? 0 : 1 }
                }
                transition={
                  state === "current" && !reduced
                    ? transitions.pulse
                    : reduced
                      ? reducedFade()
                      : transitions.micro
                }
              />
            </span>
            <span
              className={cn(
                "mt-2 block truncate font-mono text-label uppercase tracking-[0.04em] sm:tracking-[0.14em]",
                state === "upcoming" || state === "unavailable"
                  ? "text-ink-muted"
                  : state === "failed"
                    ? "text-pen-red-strong"
                    : "text-ink",
              )}
            >
              {LABELS[target]}
              <span className="sr-only">
                {state === "done"
                  ? " : terminé"
                  : state === "current"
                    ? " : en cours"
                    : state === "failed"
                      ? " : interrompu"
                      : state === "unavailable"
                        ? " : bientôt disponible"
                        : " : à venir"}
              </span>
            </span>
            {state === "unavailable" ? (
              <span aria-hidden className="mt-0.5 block truncate text-xs text-ink-muted">
                bientôt
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
