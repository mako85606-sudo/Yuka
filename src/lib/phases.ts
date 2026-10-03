/**
 * Étapes réelles du serveur pendant une analyse, dans l'ordre. L'interface
 * n'affiche une étape que lorsque le serveur l'a effectivement atteinte.
 */
export const SERVER_STEPS = ["received", "reading", "checking", "pricing", "verdict"] as const;

export type ServerStep = (typeof SERVER_STEPS)[number];

/** `idle` avant l'envoi, `done` quand tout est affiché. */
export type ScenePhase = "idle" | ServerStep | "done";

const ORDER: readonly ScenePhase[] = ["idle", ...SERVER_STEPS, "done"];

/** Vrai si `current` est au moins aussi avancée que `target`. */
export function hasReached(current: ScenePhase, target: ScenePhase): boolean {
  return ORDER.indexOf(current) >= ORDER.indexOf(target);
}
