"use client";

import { useEffect, useEffectEvent, useMemo, useState, type ReactNode, type Ref } from "react";
import { MotionPreferences, useMotionPrefs } from "@/components/motion/MotionPreferences";
import { CorrectionScene } from "@/components/scene/CorrectionScene";
import { usePacedPhase } from "@/components/scene/use-paced-phase";
import type { AnalysisData } from "@/lib/analysis/live-state";
import { sheetFromAnalysis } from "@/lib/analysis/sheet";
import type { ScenePhase } from "@/lib/phases";
import { annotationCount, VERDICT_LABELS } from "@/lib/scene-quote";
import { fr } from "@/lib/typography";
import { ResultDetails, ResultSummary } from "./AnalysisResult";
import { StepTracker } from "./StepTracker";

interface AnalysisViewProps {
  readonly data: AnalysisData;
  /** Étape atteinte par le serveur ; `done` quand le verdict est arrivé. */
  readonly target: ScenePhase;
  /** Analyse en direct (lignes au fil de la lecture) ; faux pour une analyse rouverte, rejouée en entier. */
  readonly live: boolean;
  /** Identifiant stable du devis affiché, si l'analyse n'est pas (encore) enregistrée. */
  readonly sheetId: string;
  readonly headingRef?: Ref<HTMLHeadingElement>;
  readonly onRestart?: () => void;
  /** Appelé quand toute la vérification est affichée. */
  readonly onShown?: () => void;
  /**
   * Page de partage : le lieu affiché (la région) remplace le département, et
   * l'en-tête perd ses dates. Absent : analyse privée.
   */
  readonly place?: string | null;
  /** Ce qui remplace le résumé privé une fois la vérification affichée (page de partage). */
  readonly summary?: ReactNode;
  /** Ce qui remplace le détail privé sous le devis ; `null` : rien. */
  readonly details?: ReactNode;
}

/**
 * Une analyse à l'écran. Sur ordinateur, le devis lu à gauche, et à droite un
 * panneau qui reste en vue : le suivi des étapes, puis le résumé (verdict,
 * économie, points clés). Sur mobile, le panneau passe au-dessus du devis :
 * l'économie se lit en premier. Le détail suit sous le devis.
 *
 * La vérification du devis suit les vraies étapes du serveur sans jamais les
 * devancer. Un tap sur le devis, ou « Tout afficher » (dans le panneau de
 * suivi), passe l'animation.
 */
export function AnalysisView({
  data,
  target,
  live,
  sheetId,
  headingRef,
  onRestart,
  onShown,
  place,
  summary,
  details,
}: AnalysisViewProps) {
  const { reduced } = useMotionPrefs();
  const [skipped, setSkipped] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const correctedAt = data.correctedAt;
  const quote = useMemo(
    () =>
      sheetFromAnalysis({
        id: data.analysisId ?? sheetId,
        header: data.header,
        lines: data.lines,
        extraction: data.extraction,
        findings: data.findings,
        prices: data.prices,
        verdict: data.verdict?.verdict ?? null,
        correctedAt: correctedAt ? new Date(correctedAt) : null,
        ...(place === undefined ? {} : { place, hideDates: true }),
      }),
    [
      data.analysisId,
      sheetId,
      data.header,
      data.lines,
      data.extraction,
      data.findings,
      data.prices,
      data.verdict,
      correctedAt,
      place,
    ],
  );
  const shown = usePacedPhase(
    target,
    { lines: quote.lines.length, issues: annotationCount(quote), prices: quote.prices.length },
    { reduced, live, skip: skipped },
  );
  const behind = shown !== target;
  const done = shown === "done";
  const notifyShown = useEffectEvent(() => onShown?.());

  useEffect(() => {
    if (done) notifyShown();
  }, [done]);

  const showAll = () => {
    if (behind) setSkipped(true);
  };

  // En direct, le suivi montre l'étape du serveur ; une analyse rouverte, celle qui se rejoue.
  const trackerStep = live ? target : shown;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-x-10">
      <aside className="lg:sticky lg:top-6 lg:col-start-2 lg:row-span-2 lg:row-start-1">
        {done ? (
          (summary ?? (
            <ResultSummary data={data} deleted={deleted} headingRef={headingRef} onRestart={onRestart} />
          ))
        ) : (
          <section aria-label="Avancement" className="rounded-lg border border-rule bg-paper-raised p-5 sm:p-6">
            <p className="text-sm font-semibold text-ink">
              {live ? fr("Vérification en cours") : fr("Relecture de la vérification")}
            </p>
            <StepTracker step={trackerStep === "done" ? "verdict" : trackerStep} running className="mt-4 hidden lg:block" />
            <StepTracker
              step={trackerStep === "done" ? "verdict" : trackerStep}
              running
              layout="bar"
              className="mt-4 lg:hidden"
            />
            <p className="mt-4 hidden text-sm leading-relaxed text-ink-muted lg:block">
              {fr("Les lignes s'affichent à mesure qu'elles sont lues ; les constats et les prix suivent.")}
            </p>
            {behind && !skipped ? (
              <button
                type="button"
                onClick={showAll}
                className="mt-4 text-sm font-medium text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-ink"
              >
                Tout afficher
              </button>
            ) : null}
          </section>
        )}
      </aside>

      <div className="min-w-0 lg:col-start-1 lg:row-start-1">
        <MotionPreferences skip={skipped}>
          <div onClick={showAll}>
            <CorrectionScene
              quote={quote}
              phase={shown}
              live={live}
              titleAs="h2"
              label={target === "done" ? "Devis vérifié" : "Devis en cours de vérification"}
            />
          </div>
          {done && data.verdict ? (
            <p className="sr-only" role="status">
              {`Vérification terminée. Verdict : ${VERDICT_LABELS[data.verdict.verdict]}.`}
            </p>
          ) : null}
        </MotionPreferences>
      </div>

      {done && details !== null ? (
        <div className="min-w-0 lg:col-start-1">
          {details ?? <ResultDetails data={data} deleted={deleted} onDeleted={() => setDeleted(true)} />}
        </div>
      ) : null}
    </div>
  );
}
