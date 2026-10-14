import { useEffect, useState } from "react";
import type { ScriptStep } from "@/lib/demo-script";
import type { ScenePhase } from "@/lib/phases";

/**
 * Rejoue un scénario de démo : renvoie l'étape atteinte. Réservé aux démos
 * (planche de style, landing) ; l'application suit le flux réel du serveur.
 *
 * Pour rejouer, remonter le composant (changer sa `key`).
 */
export function usePhaseScript(
  script: readonly ScriptStep[],
  startPhase: ScenePhase = "idle",
): ScenePhase {
  const [phase, setPhase] = useState<ScenePhase>(startPhase);

  useEffect(() => {
    if (startPhase === "done") return;
    const timers = script.map((step) =>
      window.setTimeout(() => setPhase(step.phase), step.at * 1000),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [script, startPhase]);

  return phase;
}
