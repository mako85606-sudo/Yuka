import {
  endOf,
  issuesSchedule,
  lineSchedule,
  priceSchedule,
  verdictBeats,
} from "@/lib/choreography";
import { beats, durations, springs } from "@/lib/motion";
import { hasReached, SERVER_STEPS, type ScenePhase } from "@/lib/phases";

/**
 * Rythme de la correction à l'écran. Chaque étape « serveur » ouvre un bloc
 * (lecture, vérifications, prix, verdict) ; le bloc suivant attend que le
 * précédent ait fini de s'afficher. L'écran ne devance jamais le serveur : il
 * peut seulement prendre le temps de montrer, dans l'ordre, ce que le serveur
 * a déjà fait.
 *
 * `demoScript` en tire le scénario complet d'une démo (planche de style,
 * landing) ; `use-paced-phase` l'applique au vrai flux.
 */

export interface DemoCounts {
  readonly lines: number;
  /** Gestes de vérification : problèmes sur les lignes, sur les totaux, remarques. */
  readonly issues: number;
  readonly prices: number;
}

export interface PaceOptions {
  readonly reduced?: boolean;
  /**
   * Lecture en direct : les lignes sont déjà apparues au fil de la lecture
   * réelle, le bloc de lecture n'a plus qu'à laisser la dernière se poser.
   */
  readonly live?: boolean;
}

/** Respiration entre deux blocs. */
const PAUSE = durations.micro;

const ORDER: readonly ScenePhase[] = ["idle", ...SERVER_STEPS, "done"];

/** L'étape qui suit, ou `null` après la dernière. */
export function nextPhase(phase: ScenePhase): ScenePhase | null {
  return ORDER[ORDER.indexOf(phase) + 1] ?? null;
}

/** Temps d'affichage du bloc d'une étape, en secondes, avant de passer à la suivante. */
export function blockDuration(phase: ScenePhase, counts: DemoCounts, options: PaceOptions = {}): number {
  const { reduced = false, live = false } = options;
  const schedule = { reduced };
  switch (phase) {
    case "idle":
    case "done":
      return 0;
    case "received":
      // La lecture commence pendant que la feuille finit de se poser.
      return reduced ? durations.reducedFade : springs.gentle.visualDuration * beats.readingAfterDrop;
    case "reading": {
      if (live) return (reduced ? durations.reducedFade : durations.lineReveal) + PAUSE;
      const lines = lineSchedule(counts.lines, schedule);
      const linesEnd = lines.length > 0 ? endOf(lines[lines.length - 1]!) : 0;
      return Math.max(linesEnd, reduced ? 0 : durations.scanPass) + PAUSE;
    }
    case "checking": {
      const issues = issuesSchedule(counts.issues, schedule);
      return (issues.length > 0 ? endOf(issues[issues.length - 1]!.note) : 0) + PAUSE;
    }
    case "pricing": {
      const prices = priceSchedule(counts.prices, schedule);
      return (prices.length > 0 ? endOf(prices[prices.length - 1]!) : 0) + PAUSE;
    }
    case "verdict": {
      const verdict = verdictBeats(schedule);
      return Math.max(endOf(verdict.stamp), endOf(verdict.ink)) + PAUSE;
    }
  }
}

/** Vrai si l'écran peut passer à l'étape suivante : le serveur l'a atteinte. */
export function canAdvance(shown: ScenePhase, target: ScenePhase): boolean {
  const next = nextPhase(shown);
  return next !== null && hasReached(target, next);
}

export interface ScriptStep {
  readonly phase: ScenePhase;
  /** Secondes depuis le début de la démo. */
  readonly at: number;
}

/** Scénario d'une démo : à quel moment chaque étape « serveur » arrive. */
export function demoScript(counts: DemoCounts, reduced = false): ScriptStep[] {
  const steps: ScriptStep[] = [];
  let at = 0;
  for (let phase = nextPhase("idle"); phase !== null; phase = nextPhase(phase)) {
    steps.push({ phase, at });
    at += blockDuration(phase, counts, { reduced });
  }
  return steps;
}
