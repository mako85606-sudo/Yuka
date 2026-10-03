import {
  endOf,
  issuesSchedule,
  lineSchedule,
  priceSchedule,
  verdictBeats,
} from "@/lib/choreography";
import { beats, durations, springs } from "@/lib/motion";
import type { ScenePhase } from "@/lib/phases";

/**
 * Scénario d'une démo (planche de style, landing) : à quel moment chaque
 * étape « serveur » arrive. Une démo rejoue une analyse fictive ; dans
 * l'application, ces étapes viennent du vrai flux du serveur.
 *
 * Chaque étape attend que le bloc précédent ait fini de s'afficher.
 */

export interface ScriptStep {
  readonly phase: ScenePhase;
  /** Secondes depuis le début de la démo. */
  readonly at: number;
}

export interface DemoCounts {
  readonly lines: number;
  readonly issues: number;
  readonly prices: number;
}

/** Respiration entre deux blocs. */
const PAUSE = durations.micro;

export function demoScript(counts: DemoCounts, reduced = false): ScriptStep[] {
  const options = { reduced };
  const steps: ScriptStep[] = [{ phase: "received", at: 0 }];
  let at = 0;

  // La lecture commence pendant que la feuille finit de se poser.
  at += reduced ? durations.reducedFade : springs.gentle.visualDuration * beats.readingAfterDrop;
  steps.push({ phase: "reading", at });

  const lines = lineSchedule(counts.lines, options);
  const linesEnd = lines.length > 0 ? endOf(lines[lines.length - 1]!) : 0;
  at += Math.max(linesEnd, reduced ? 0 : durations.scanPass) + PAUSE;
  steps.push({ phase: "checking", at });

  const issues = issuesSchedule(counts.issues, options);
  at += (issues.length > 0 ? endOf(issues[issues.length - 1]!.note) : 0) + PAUSE;
  steps.push({ phase: "pricing", at });

  const prices = priceSchedule(counts.prices, options);
  at += (prices.length > 0 ? endOf(prices[prices.length - 1]!) : 0) + PAUSE;
  steps.push({ phase: "verdict", at });

  const verdict = verdictBeats(options);
  at += Math.max(endOf(verdict.stamp), endOf(verdict.ink)) + PAUSE;
  steps.push({ phase: "done", at });

  return steps;
}
