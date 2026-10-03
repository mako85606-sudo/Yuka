"use client";

import { AnimatePresence, motion, useInView } from "motion/react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { MotionPreferences, useMotionPrefs } from "@/components/motion/MotionPreferences";
import { ScriptedScene } from "@/components/scene/ScriptedScene";
import { cn } from "@/lib/cn";
import { angles, demoLoop, offsets, reducedFade, transitions } from "@/lib/motion";
import { describeCorrection, type SceneQuote } from "@/lib/scene-quote";
import { useMaxHeight } from "@/lib/use-max-height";
import { usePageVisible } from "@/lib/use-page-visible";

interface DemoLoopProps {
  readonly quotes: readonly SceneQuote[];
  readonly className?: string;
}

/**
 * Démo de la landing : des devis fictifs corrigés en boucle, avec la même
 * chorégraphie que l'analyse réelle.
 *
 * - Un tap sur la feuille passe l'animation et affiche tout.
 * - « Pause » arrête la boucle (et affiche tout de suite la correction en
 *   cours) : une animation automatique doit pouvoir être arrêtée.
 * - La boucle n'avance pas hors écran ni dans un onglet en arrière-plan.
 * - En mouvement réduit, pas de lecture automatique : un exemple s'affiche
 *   en fondus, les suivants à la demande.
 * - La place réservée suit la plus haute feuille vue : rien ne bouge sous la
 *   démo quand elle passe d'un devis à l'autre.
 */
export function DemoLoop({ quotes, className }: DemoLoopProps) {
  const { reduced } = useMotionPrefs();
  const frameRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const inView = useInView(frameRef, { amount: 0.3 });
  const pageVisible = usePageVisible();
  const reservedHeight = useMaxHeight(contentRef);

  const [index, setIndex] = useState(0);
  const [run, setRun] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const [done, setDone] = useState(false);
  const [paused, setPaused] = useState(false);

  const quote = quotes[index] ?? quotes[0];
  const autoplay = !reduced && !paused;

  const goTo = (next: number) => {
    setIndex(next);
    setRun((value) => value + 1);
    setSkipped(false);
    setDone(false);
  };
  const advance = useEffectEvent(() => goTo((index + 1) % quotes.length));

  useEffect(() => {
    if (!done || !autoplay || !inView || !pageVisible) return;
    const timer = window.setTimeout(() => advance(), demoLoop.hold * 1000);
    return () => window.clearTimeout(timer);
  }, [done, autoplay, inView, pageVisible]);

  const showAll = () => {
    if (!done && !skipped) setSkipped(true);
  };

  const togglePause = () => {
    if (paused) {
      setPaused(false);
      if (done) goTo((index + 1) % quotes.length);
    } else {
      setPaused(true);
      showAll();
    }
  };

  if (!quote) return null;

  return (
    <figure className={cn("relative", className)} aria-label="Démonstration sur des devis fictifs">
      <div
        ref={frameRef}
        aria-hidden
        onPointerDown={showAll}
        style={reservedHeight ? { minHeight: reservedHeight } : undefined}
      >
        <div ref={contentRef}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={run}
              exit={
                reduced
                  ? { opacity: 0 }
                  : { opacity: 0, y: offsets.sheetExitY, rotate: angles.sheetExit }
              }
              transition={reduced ? reducedFade() : transitions.sheetExit}
            >
              <MotionPreferences skip={skipped}>
                <ScriptedScene
                  key={skipped ? "fin" : "jeu"}
                  quote={quote}
                  entrance={run > 0}
                  startDone={skipped}
                  compact
                  onDone={() => setDone(true)}
                />
              </MotionPreferences>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <figcaption className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <span className="font-mono text-label uppercase text-ink-muted">Exemple fictif</span>
        <span className="sr-only">{describeCorrection(quote)}</span>
        <span className="flex flex-wrap items-center gap-2">
          <span
            role="group"
            aria-label="Choisir un exemple"
            className="flex rounded-[6px] border border-rule-strong p-0.5"
          >
            {quotes.map((item, itemIndex) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={itemIndex === index}
                onClick={() => goTo(itemIndex)}
                className={cn(
                  "h-7 rounded-[4px] px-2.5 text-[0.8125rem]",
                  itemIndex === index ? "bg-ink text-paper-raised" : "text-ink hover:bg-paper-raised",
                )}
              >
                {item.category}
              </button>
            ))}
          </span>
          {/* Masqué en CSS en mouvement réduit (pas de lecture automatique) : même DOM partout. */}
          <button
            type="button"
            aria-pressed={paused}
            onClick={togglePause}
            className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-rule-strong px-2.5 text-[0.8125rem] text-ink hover:bg-paper-raised motion-reduce:hidden"
          >
            <PlayPauseGlyph paused={paused} />
            {paused ? "Reprendre" : "Pause"}
          </button>
        </span>
      </figcaption>
    </figure>
  );
}

function PlayPauseGlyph({ paused }: { readonly paused: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 12 12" className="size-3 fill-current">
      {paused ? (
        <path d="M3 1.8v8.4c0 .5.5.8.9.5l6.3-4.2a.6.6 0 0 0 0-1L3.9 1.3c-.4-.3-.9 0-.9.5Z" />
      ) : (
        <>
          <rect x="2.2" y="1.5" width="2.6" height="9" rx="0.8" />
          <rect x="7.2" y="1.5" width="2.6" height="9" rx="0.8" />
        </>
      )}
    </svg>
  );
}
