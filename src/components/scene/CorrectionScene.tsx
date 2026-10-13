"use client";

import { useMemo, useState } from "react";
import { useMotionPrefs } from "@/components/motion/MotionPreferences";
import { GhostLines } from "@/components/quote/GhostLines";
import { HeaderPlaceholder } from "@/components/quote/HeaderPlaceholder";
import { QuoteHeader } from "@/components/quote/QuoteHeader";
import { QuoteLine } from "@/components/quote/QuoteLine";
import { QuoteTotals } from "@/components/quote/QuoteTotals";
import { SheetRemarks } from "@/components/quote/SheetRemarks";
import { PaperSheet } from "@/components/signature/PaperSheet";
import { Stamp } from "@/components/signature/Stamp";
import { issuesSchedule, lineSchedule, priceSchedule, verdictBeats } from "@/lib/choreography";
import { cn } from "@/lib/cn";
import { hasReached, type ScenePhase } from "@/lib/phases";
import { annotationCount, issueSeverity, type CorrectionQuote } from "@/lib/scene-quote";

interface CorrectionSceneProps {
  readonly quote: CorrectionQuote;
  /** Étape atteinte : chaque bloc s'anime quand son étape arrive. */
  readonly phase: ScenePhase;
  /**
   * Lecture en direct : les lignes apparaissent au moment où elles sont lues
   * (sans décalage calculé), et des lignes fantômes attendent la suite.
   */
  readonly live?: boolean;
  /** Joue le dépôt de la feuille au montage. Faux : la feuille est déjà posée. */
  readonly entrance?: boolean;
  /** Version resserrée, pour la démo de la landing. */
  readonly compact?: boolean;
  /** Nom accessible de la feuille. */
  readonly label?: string;
  readonly className?: string;
}

/**
 * La correction complète d'un devis : dépôt de la feuille, lecture (scan et
 * lignes), vérifications (surligneur, cercle, note ; sur les lignes, puis sur
 * les totaux, puis les remarques sur le devis entier), prix (compteurs),
 * verdict (tampon et secousse).
 *
 * Tout ce qui est connu est posé dès le départ, invisible : la mise en page ne
 * bouge pas pendant la correction, seuls opacité, transformations et tracés
 * s'animent quand leur étape arrive. En direct, ce qui n'est pas encore connu
 * arrive avec son étape. L'ordre à l'intérieur de chaque bloc vient de
 * `@/lib/choreography`.
 */
export function CorrectionScene({
  quote,
  phase,
  live = false,
  entrance = true,
  compact = false,
  label,
  className,
}: CorrectionSceneProps) {
  const { reduced } = useMotionPrefs();
  const [shakeKey, setShakeKey] = useState(0);
  const totalIssues = quote.totalIssues ?? [];
  const remarks = quote.remarks ?? [];

  const lineTimes = useMemo(
    () => lineSchedule(quote.lines.length, { reduced }),
    [quote.lines.length, reduced],
  );
  // Un seul calendrier pour toute la vérification : lignes, puis totaux, puis remarques.
  const gestures = annotationCount(quote);
  const issueTimes = useMemo(() => issuesSchedule(gestures, { reduced }), [gestures, reduced]);
  const priceTimes = useMemo(
    () => priceSchedule(quote.prices.length, { reduced }),
    [quote.prices.length, reduced],
  );
  const verdict = verdictBeats({ reduced });

  const linesRevealed = hasReached(phase, "reading");
  const issuesActive = hasReached(phase, "checking");
  const pricesActive = hasReached(phase, "pricing");
  const verdictActive = hasReached(phase, "verdict");
  const lastLine = lineTimes[lineTimes.length - 1];
  const totalsOffset = quote.issues.length;
  const remarksOffset = totalsOffset + totalIssues.length;
  const reading = live && quote.totals === null;

  return (
    <PaperSheet
      className={className}
      entrance={entrance}
      scanning={phase === "reading"}
      shakeKey={shakeKey}
      label={label}
    >
      {quote.title === null ? (
        <HeaderPlaceholder />
      ) : (
        <QuoteHeader
          category={quote.category ?? ""}
          department={quote.department}
          title={quote.title}
          issuedAt={quote.issuedAt}
          validityDays={quote.validityDays}
          showDates={quote.showDates}
          compact={compact}
          stamp={
            quote.verdict ? (
              <Stamp
                verdict={quote.verdict}
                id={quote.id}
                date={quote.correctedAt ?? undefined}
                active={verdictActive}
                delay={verdict.stamp.start}
                size={compact ? "sm" : "md"}
                onImpact={() => setShakeKey((key) => key + 1)}
              />
            ) : null
          }
        />
      )}

      {/* Largeur de la marge : 9 puis 10rem en compact, sinon 10 puis 12rem sur grand écran. */}
      <div
        className={cn(
          "relative",
          compact
            ? "[--margin-col:9rem] lg:[--margin-col:10rem]"
            : "[--margin-col:10rem] lg:[--margin-col:12rem]",
        )}
      >
        {/* Filet rouge de la marge, comme sur une copie. */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 hidden w-px bg-margin-rule sm:block",
            compact
              ? "right-[calc(1.5rem+var(--margin-col)+0.875rem)]"
              : "right-[calc(2rem+var(--margin-col)+0.875rem)]",
          )}
        />
        <div className={compact ? "px-5 pt-3 sm:px-6" : "px-5 pt-4 sm:px-8"}>
          <div className="flex justify-between font-mono text-label uppercase text-ink-muted sm:mr-[calc(var(--margin-col)+1.75rem)]">
            <span>Désignation</span>
            <span>Montant HT</span>
          </div>
          {quote.lines.length > 0 ? (
            <ol className="divide-y divide-rule">
              {quote.lines.map((line, index) => {
                const issueIndex = quote.issues.findIndex((issue) => issue.lineId === line.id);
                const issue = quote.issues[issueIndex];
                const issueBeats = issueTimes[issueIndex];
                const priceIndex = quote.prices.findIndex((price) => price.lineId === line.id);
                const price = quote.prices[priceIndex];
                const priceTime = priceTimes[priceIndex];
                return (
                  <QuoteLine
                    key={line.id}
                    line={line}
                    compact={compact}
                    revealed={linesRevealed}
                    delay={live ? 0 : (lineTimes[index]?.start ?? 0)}
                    issue={
                      issue && issueBeats
                        ? {
                            id: issue.id,
                            note: issue.note,
                            detail: issue.detail,
                            beats: issueBeats,
                            active: issuesActive,
                            circled: issueSeverity(issue) !== "unconfirmed",
                          }
                        : undefined
                    }
                    price={
                      price && priceTime
                        ? {
                            delta: price.delta,
                            source: price.source,
                            delay: priceTime.start,
                            active: pricesActive,
                          }
                        : undefined
                    }
                  />
                );
              })}
            </ol>
          ) : null}
          {reading ? <GhostLines count={quote.lines.length > 0 ? 1 : undefined} /> : null}
          {!reading && quote.lines.length === 0 ? (
            <p className="py-6 text-sm text-ink-muted">Aucune ligne lue.</p>
          ) : null}
        </div>
        {quote.totals ? (
          <QuoteTotals
            totals={quote.totals}
            vatRate={quote.vatRate}
            revealed={linesRevealed}
            delay={live ? 0 : (lastLine?.start ?? 0)}
            compact={compact}
            issues={totalIssues.flatMap((issue, index) => {
              const beats = issueTimes[totalsOffset + index];
              return beats
                ? [{ ...issue, beats, active: issuesActive, circled: issue.severity !== "unconfirmed" }]
                : [];
            })}
          />
        ) : null}
        <SheetRemarks
          remarks={remarks}
          schedule={remarks.map((_, index) => issueTimes[remarksOffset + index]?.highlight ?? { start: 0, duration: 0 })}
          active={issuesActive}
          compact={compact}
        />
      </div>
    </PaperSheet>
  );
}
