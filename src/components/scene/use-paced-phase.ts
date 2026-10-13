import { useEffect, useRef, useState } from "react";
import { blockDuration, canAdvance, nextPhase, type DemoCounts } from "@/lib/demo-script";
import { hasReached, type ScenePhase } from "@/lib/phases";

interface PacedPhaseOptions {
  readonly reduced: boolean;
  /** Lignes déjà montrées au fil de la lecture réelle. */
  readonly live: boolean;
  /** Animation passée : l'écran rejoint tout de suite le serveur. */
  readonly skip: boolean;
  /** Étape affichée au départ (rejeu d'une analyse : `idle`). */
  readonly initial?: ScenePhase;
}

/**
 * L'étape affichée par la feuille. Elle suit l'étape atteinte par le serveur
 * (`target`) sans jamais la devancer, un bloc à la fois : si le serveur va
 * plus vite que la correction à l'écran, chaque bloc a le temps de se jouer
 * avant le suivant. Une analyse terminée (`target` = `done`) se rejoue ainsi
 * en entier.
 */
export function usePacedPhase(target: ScenePhase, counts: DemoCounts, options: PacedPhaseOptions): ScenePhase {
  const { reduced, live, skip, initial = "idle" } = options;
  const [shown, setShown] = useState<ScenePhase>(initial);
  const shownSince = useRef(0);
  const { lines, issues, prices } = counts;

  // Repart avec une nouvelle analyse (le serveur revient en arrière).
  if (!hasReached(target, shown) && shown !== target) {
    setShown(target);
  }

  useEffect(() => {
    shownSince.current = performance.now();
  }, [shown]);

  useEffect(() => {
    if (skip || !canAdvance(shown, target)) return;
    const elapsed = (performance.now() - shownSince.current) / 1000;
    const wait = Math.max(0, blockDuration(shown, { lines, issues, prices }, { reduced, live }) - elapsed);
    const timer = window.setTimeout(() => setShown(nextPhase(shown) ?? shown), wait * 1000);
    return () => window.clearTimeout(timer);
  }, [shown, target, skip, reduced, live, lines, issues, prices]);

  return skip ? target : shown;
}
