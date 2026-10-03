"use client";

import { useState } from "react";
import { MotionPreferences } from "@/components/motion/MotionPreferences";
import { ScriptedScene } from "@/components/scene/ScriptedScene";
import { Button } from "@/components/ui/Button";
import { plumbingQuote } from "@/fixtures/demo-quotes";

/**
 * La scène complète sur le devis fictif. Un tap sur la feuille (ou le bouton
 * « Tout afficher ») passe l'animation et affiche tout.
 */
export function ScenePlate() {
  const [run, setRun] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const [done, setDone] = useState(false);
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
          <div className="mx-auto max-w-3xl">
            <ScriptedScene
              key={`${run}-${skipped}`}
              quote={plumbingQuote}
              startDone={skipped}
              showPhase
              onDone={() => setDone(true)}
            />
          </div>
        </MotionPreferences>
      </div>
    </section>
  );
}
