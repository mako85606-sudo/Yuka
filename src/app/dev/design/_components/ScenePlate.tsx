"use client";

import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { MotionPreferences, useMotionPrefs } from "@/components/motion/MotionPreferences";
import { CorrectionScene } from "@/components/scene/CorrectionScene";
import { usePhaseScript } from "@/components/scene/use-phase-script";
import { Button } from "@/components/ui/Button";
import { demoQuote } from "@/fixtures/demo-quote";
import { demoScript, type ScriptStep } from "@/lib/demo-script";
import type { ScenePhase } from "@/lib/phases";

const PHASE_LABELS: Record<ScenePhase, string> = {
  idle: "en attente",
  received: "reçu",
  reading: "lecture",
  checking: "vérifications",
  pricing: "prix",
  verdict: "verdict",
  done: "terminé",
};

/**
 * La scène complète sur le devis fictif. Un tap sur la feuille (ou le bouton
 * « Tout afficher ») passe l'animation et affiche tout.
 */
export function ScenePlate() {
  const { reduced } = useMotionPrefs();
  const [run, setRun] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const [done, setDone] = useState(false);
  const script = useMemo(
    () =>
      demoScript(
        {
          lines: demoQuote.lines.length,
          issues: demoQuote.issues.length,
          prices: demoQuote.prices.length,
        },
        reduced,
      ),
    [reduced],
  );
  const running = !done && !skipped;

  const replay = () => {
    setSkipped(false);
    setDone(false);
    setRun((value) => value + 1);
  };

  return (
    <section className="pt-2">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 max-w-prose">
          <h2 className="font-display text-title text-ink">La scène complète</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Dépôt, lecture, vérifications, prix, verdict : l&apos;ordre où un humain corrigerait.
            Ici les étapes sont simulées ; dans l&apos;app, elles suivront le vrai flux du
            serveur. Touche la feuille pour tout afficher d&apos;un coup.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={!running}
            onClick={() => setSkipped(true)}
          >
            Tout afficher
          </Button>
          <Button size="sm" onClick={replay}>
            Rejouer
          </Button>
        </div>
      </div>

      <div
        className="mt-10 min-h-[46rem] sm:min-h-[40rem]"
        onPointerDown={running ? () => setSkipped(true) : undefined}
      >
        <MotionPreferences skip={skipped}>
          <ScriptedScene
            key={`${run}-${skipped}`}
            script={script}
            startDone={skipped}
            onDone={() => setDone(true)}
          />
        </MotionPreferences>
      </div>
    </section>
  );
}

interface ScriptedSceneProps {
  readonly script: readonly ScriptStep[];
  readonly startDone: boolean;
  readonly onDone: () => void;
}

function ScriptedScene({ script, startDone, onDone }: ScriptedSceneProps) {
  const phase = usePhaseScript(script, startDone ? "done" : "idle");
  const notifyDone = useEffectEvent(onDone);

  useEffect(() => {
    if (phase === "done") notifyDone();
  }, [phase]);

  return (
    <div className="mx-auto max-w-3xl">
      <p className="mb-4 font-mono text-label uppercase text-ink-muted" aria-live="polite">
        Étape simulée : {PHASE_LABELS[phase]}
      </p>
      <CorrectionScene quote={demoQuote} phase={phase} />
    </div>
  );
}
