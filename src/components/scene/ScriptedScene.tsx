"use client";

import { useEffect, useEffectEvent, useMemo } from "react";
import { useMotionPrefs } from "@/components/motion/MotionPreferences";
import { CorrectionScene } from "@/components/scene/CorrectionScene";
import { usePhaseScript } from "@/components/scene/use-phase-script";
import { demoScript } from "@/lib/demo-script";
import type { ScenePhase } from "@/lib/phases";
import type { SceneQuote } from "@/lib/scene-quote";

const PHASE_LABELS: Record<ScenePhase, string> = {
  idle: "en attente",
  received: "reçu",
  reading: "lecture",
  checking: "vérifications",
  pricing: "prix",
  verdict: "verdict",
  done: "terminé",
};

interface ScriptedSceneProps {
  readonly quote: SceneQuote;
  /** Démarre directement à la fin (animation passée). */
  readonly startDone?: boolean;
  /** Joue le dépôt de la feuille. Faux : la feuille est déjà posée. */
  readonly entrance?: boolean;
  readonly compact?: boolean;
  /** Affiche l'étape simulée au-dessus de la feuille (planche de style). */
  readonly showPhase?: boolean;
  readonly onDone?: () => void;
}

/**
 * Une correction de démonstration : les étapes « serveur » sont simulées par
 * `demoScript`. Réservé aux démos ; l'écran de résultat suit le vrai flux.
 * Pour rejouer, remonter le composant (changer sa `key`).
 */
export function ScriptedScene({
  quote,
  startDone = false,
  entrance = true,
  compact = false,
  showPhase = false,
  onDone,
}: ScriptedSceneProps) {
  const { reduced } = useMotionPrefs();
  const script = useMemo(
    () =>
      demoScript(
        { lines: quote.lines.length, issues: quote.issues.length, prices: quote.prices.length },
        reduced,
      ),
    [quote, reduced],
  );
  const phase = usePhaseScript(script, startDone ? "done" : "idle");
  const notifyDone = useEffectEvent(() => onDone?.());

  useEffect(() => {
    if (phase === "done") notifyDone();
  }, [phase]);

  return (
    <>
      {showPhase ? (
        <p className="mb-4 font-mono text-label uppercase text-ink-muted" aria-live="polite">
          Étape simulée : {PHASE_LABELS[phase]}
        </p>
      ) : null}
      <CorrectionScene quote={quote} phase={phase} entrance={entrance} compact={compact} />
    </>
  );
}
