import { beats, durations, STAMP_IMPACT, stagger, springs } from "@/lib/motion";

/**
 * Calendrier de la correction : quand chaque geste commence, en secondes,
 * relativement au début de son bloc. Les blocs suivent les vraies étapes du
 * serveur (reading → checking → pricing → verdict) ; ce module ne fait que
 * l'ordre interne de chaque bloc.
 *
 * En mouvement réduit, il n'y a ni décalage ni enchaînement : tout le bloc
 * apparaît d'un seul fondu.
 */

export interface Segment {
  readonly start: number;
  readonly duration: number;
}

export interface ScheduleOptions {
  /** Début du bloc, en secondes. */
  readonly startAt?: number;
  readonly reduced?: boolean;
}

export function endOf(segment: Segment): number {
  return segment.start + segment.duration;
}

function reducedSegment(startAt: number): Segment {
  return { start: startAt, duration: durations.reducedFade };
}

/**
 * Lignes extraites, une par une : 50 ms d'écart (entre 40 et 60 ms). Si le
 * devis est long, l'écart se resserre jusqu'à 40 ms ; au-delà, les dernières
 * lignes arrivent ensemble pour que le bloc tienne en 1,2 s.
 */
export function lineSchedule(count: number, options: ScheduleOptions = {}): Segment[] {
  const { startAt = 0, reduced = false } = options;
  if (count <= 0) return [];
  if (reduced) return Array.from({ length: count }, () => reducedSegment(startAt));

  const lastStart = durations.blockMax - durations.lineReveal;
  const fitting = count > 1 ? lastStart / (count - 1) : stagger.lines;
  const step = Math.min(
    stagger.linesMax,
    Math.max(stagger.linesMin, Math.min(stagger.lines, fitting)),
  );
  return Array.from({ length: count }, (_, index) => ({
    start: startAt + Math.min(index * step, lastStart),
    duration: durations.lineReveal,
  }));
}

export interface IssueBeats {
  readonly highlight: Segment;
  readonly circle: Segment;
  readonly note: Segment;
}

/** Un problème : surligneur, puis cercle rouge, puis note de marge. */
export function issueBeats(options: ScheduleOptions = {}): IssueBeats {
  const { startAt = 0, reduced = false } = options;
  if (reduced) {
    const fade = reducedSegment(startAt);
    return { highlight: fade, circle: fade, note: fade };
  }
  const highlight = { start: startAt, duration: durations.highlight };
  const circle = { start: endOf(highlight), duration: durations.circle };
  const note = {
    start: circle.start + durations.circle * beats.noteAfterCircle,
    duration: durations.note,
  };
  return { highlight, circle, note };
}

/** Durée d'un problème, du premier coup de surligneur à la note posée. */
export const ISSUE_DURATION = endOf(issueBeats().note);

/** Le problème suivant commence quand le cercle du précédent se referme. */
export const ISSUE_INTERVAL = durations.highlight + durations.circle;

/** Écart minimal entre deux problèmes, pour que chaque geste reste lisible. */
export const MIN_ISSUE_INTERVAL = 0.3;

/**
 * Durée visée pour toute la phase de vérification. Au-delà de trois
 * problèmes, l'écart se resserre (sans descendre sous MIN_ISSUE_INTERVAL).
 */
export const CHECKS_PHASE_TARGET = 2 * durations.blockMax;

export function issuesSchedule(count: number, options: ScheduleOptions = {}): IssueBeats[] {
  const { startAt = 0, reduced = false } = options;
  if (count <= 0) return [];
  if (reduced) return Array.from({ length: count }, () => issueBeats({ startAt, reduced }));

  const fitting =
    count > 1 ? (CHECKS_PHASE_TARGET - ISSUE_DURATION) / (count - 1) : ISSUE_INTERVAL;
  const interval = Math.min(ISSUE_INTERVAL, Math.max(MIN_ISSUE_INTERVAL, fitting));
  return Array.from({ length: count }, (_, index) =>
    issueBeats({ startAt: startAt + index * interval }),
  );
}

/** Compteurs de prix : 120 ms d'écart, chacun 600 ms au plus, bloc ≤ 1,2 s. */
export function priceSchedule(count: number, options: ScheduleOptions = {}): Segment[] {
  const { startAt = 0, reduced = false } = options;
  if (count <= 0) return [];
  if (reduced) return Array.from({ length: count }, () => reducedSegment(startAt));

  const lastStart = durations.blockMax - durations.counter;
  const fitting = count > 1 ? lastStart / (count - 1) : stagger.prices;
  const step = Math.min(stagger.prices, fitting);
  return Array.from({ length: count }, (_, index) => ({
    start: startAt + index * step,
    duration: durations.counter,
  }));
}

export interface VerdictBeats {
  readonly stamp: Segment;
  /** Instant où le tampon touche la feuille. */
  readonly impact: number;
  readonly shake: Segment;
  readonly ink: Segment;
}

/** Le tampon tombe ; à l'impact, la feuille tressaille et l'encre gicle. */
export function verdictBeats(options: ScheduleOptions = {}): VerdictBeats {
  const { startAt = 0, reduced = false } = options;
  if (reduced) {
    const fade = reducedSegment(startAt);
    return { stamp: fade, impact: startAt, shake: fade, ink: fade };
  }
  const impact = startAt + STAMP_IMPACT;
  return {
    stamp: { start: startAt, duration: springs.stamp.visualDuration },
    impact,
    shake: { start: impact, duration: durations.shake },
    ink: { start: impact, duration: durations.inkBurst },
  };
}
