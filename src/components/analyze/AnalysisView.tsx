"use client";

import { useEffect, useEffectEvent, useMemo, useState, type ReactNode, type Ref } from "react";
import { MotionPreferences, useMotionPrefs } from "@/components/motion/MotionPreferences";
import { CorrectionScene } from "@/components/scene/CorrectionScene";
import { usePacedPhase } from "@/components/scene/use-paced-phase";
import type { AnalysisData } from "@/lib/analysis/live-state";
import { sheetFromAnalysis } from "@/lib/analysis/sheet";
import type { ScenePhase } from "@/lib/phases";
import { annotationCount, VERDICT_LABELS } from "@/lib/scene-quote";
import { AnalysisResult } from "./AnalysisResult";

interface AnalysisViewProps {
  readonly data: AnalysisData;
  /** Étape atteinte par le serveur ; `done` quand le verdict est arrivé. */
  readonly target: ScenePhase;
  /** Analyse en direct (lignes au fil de la lecture) ; faux pour une analyse rouverte, rejouée en entier. */
  readonly live: boolean;
  /** Identifiant stable de la feuille, si l'analyse n'est pas (encore) enregistrée. */
  readonly sheetId: string;
  readonly headingRef?: Ref<HTMLHeadingElement>;
  readonly onRestart?: () => void;
  /** Appelé quand toute la correction est affichée. */
  readonly onShown?: () => void;
  /**
   * Page de partage : le lieu affiché (la région) remplace le département, et
   * l'en-tête perd ses dates. Absent : analyse privée.
   */
  readonly place?: string | null;
  /** Ce qui suit la feuille une fois la correction affichée ; par défaut, la conclusion privée. */
  readonly conclusion?: ReactNode;
}

/**
 * Une analyse à l'écran : la feuille corrigée, dont la chorégraphie suit les
 * vraies étapes du serveur sans jamais les devancer, puis la conclusion. Un
 * tap sur la feuille, ou « Tout afficher », passe l'animation.
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
  conclusion,
}: AnalysisViewProps) {
  const { reduced } = useMotionPrefs();
  const [skipped, setSkipped] = useState(false);
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
  const notifyShown = useEffectEvent(() => onShown?.());

  useEffect(() => {
    if (shown === "done") notifyShown();
  }, [shown]);

  const showAll = () => {
    if (behind) setSkipped(true);
  };

  return (
    <div className="space-y-8">
      <MotionPreferences skip={skipped}>
        {/* Réservé même vide : le bouton apparaît sans faire bouger la feuille. */}
        <div className="flex h-8 items-center justify-end">
          {behind && !skipped ? (
            <button
              type="button"
              onClick={showAll}
              className="text-sm text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-ink"
            >
              Tout afficher
            </button>
          ) : null}
        </div>
        <div onClick={showAll}>
          <CorrectionScene
            quote={quote}
            phase={shown}
            live={live}
            label={target === "done" ? "Devis corrigé" : "Devis en cours de correction"}
          />
        </div>
        {shown === "done" && data.verdict ? (
          <p className="sr-only" role="status">
            {`Correction terminée. Verdict : ${VERDICT_LABELS[data.verdict.verdict]}.`}
          </p>
        ) : null}
      </MotionPreferences>

      {shown === "done"
        ? (conclusion ?? <AnalysisResult data={data} headingRef={headingRef} onRestart={onRestart} />)
        : null}
    </div>
  );
}
