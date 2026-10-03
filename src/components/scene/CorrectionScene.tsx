"use client";

import { useMemo, useState } from "react";
import { useMotionPrefs } from "@/components/motion/MotionPreferences";
import { QuoteHeader } from "@/components/quote/QuoteHeader";
import { QuoteLine } from "@/components/quote/QuoteLine";
import { QuoteTotals } from "@/components/quote/QuoteTotals";
import { PaperSheet } from "@/components/signature/PaperSheet";
import { Stamp } from "@/components/signature/Stamp";
import { demoTotals, type DemoQuote } from "@/fixtures/demo-quote";
import { issuesSchedule, lineSchedule, priceSchedule, verdictBeats } from "@/lib/choreography";
import { hasReached, type ScenePhase } from "@/lib/phases";

interface CorrectionSceneProps {
  readonly quote: DemoQuote;
  /** Étape atteinte : chaque bloc s'affiche quand son étape arrive. */
  readonly phase: ScenePhase;
  readonly className?: string;
}

/**
 * La correction complète d'un devis : dépôt de la feuille, lecture (scan et
 * lignes), vérifications (surligneur, cercle, note), prix (compteurs), verdict
 * (tampon et secousse). Chaque bloc démarre quand son étape est atteinte ;
 * l'ordre à l'intérieur d'un bloc vient de `@/lib/choreography`.
 */
export function CorrectionScene({ quote, phase, className }: CorrectionSceneProps) {
  const { reduced } = useMotionPrefs();
  const [shakeKey, setShakeKey] = useState(0);

  const lineTimes = useMemo(
    () => lineSchedule(quote.lines.length, { reduced }),
    [quote.lines.length, reduced],
  );
  const issueTimes = useMemo(
    () => issuesSchedule(quote.issues.length, { reduced }),
    [quote.issues.length, reduced],
  );
  const priceTimes = useMemo(
    () => priceSchedule(quote.prices.length, { reduced }),
    [quote.prices.length, reduced],
  );
  const verdict = verdictBeats({ reduced });
  const totals = demoTotals(quote);

  if (!hasReached(phase, "received")) return null;

  const showLines = hasReached(phase, "reading");
  const showIssues = hasReached(phase, "checking");
  const showPrices = hasReached(phase, "pricing");
  const showVerdict = hasReached(phase, "verdict");
  const lastLine = lineTimes[lineTimes.length - 1];

  return (
    <PaperSheet
      className={className}
      scanning={phase === "reading"}
      shakeKey={shakeKey}
    >
      <QuoteHeader
        category={quote.category}
        department={quote.department}
        title={quote.title}
        issuedAt={quote.issuedAt}
        validityDays={quote.validityDays}
        stamp={
          showVerdict ? (
            <Stamp
              verdict={quote.verdict}
              id={quote.id}
              date={quote.correctedAt}
              delay={verdict.stamp.start}
              onImpact={() => setShakeKey((key) => key + 1)}
            />
          ) : null
        }
      />

      {/* Largeur de la marge : 10rem, 12rem sur grand écran. */}
      <div className="relative [--margin-col:10rem] lg:[--margin-col:12rem]">
        {/* Filet rouge de la marge, comme sur une copie. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-[calc(2rem+var(--margin-col)+0.875rem)] hidden w-px bg-margin-rule sm:block"
        />
        <div className="px-5 pt-4 sm:px-8">
          <div className="flex justify-between font-mono text-label uppercase text-ink-muted sm:mr-[calc(var(--margin-col)+1.75rem)]">
            <span>Désignation</span>
            <span>Montant HT</span>
          </div>
          {showLines ? (
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
                    delay={lineTimes[index]?.start ?? 0}
                    issue={
                      showIssues && issue && issueBeats
                        ? { id: issue.id, note: issue.note, detail: issue.detail, beats: issueBeats }
                        : undefined
                    }
                    price={
                      showPrices && price && priceTime
                        ? { delta: price.delta, source: price.source, delay: priceTime.start }
                        : undefined
                    }
                  />
                );
              })}
            </ol>
          ) : (
            <GhostLines count={quote.lines.length} />
          )}
        </div>
        {showLines ? (
          <QuoteTotals
            totalHT={totals.totalHT}
            vatRate={quote.vatRate}
            totalVAT={totals.totalVAT}
            totalTTC={totals.totalTTC}
            delay={lastLine?.start ?? 0}
          />
        ) : null}
      </div>
    </PaperSheet>
  );
}

/** Avant la lecture : des lignes encore illisibles. */
function GhostLines({ count }: { readonly count: number }) {
  return (
    <ul aria-hidden className="space-y-5 py-5 sm:mr-[calc(var(--margin-col)+1.75rem)]">
      {Array.from({ length: Math.min(count, 4) }, (_, index) => (
        <li key={index} className="flex items-center gap-4">
          <span className="h-2 flex-1 rounded-full bg-rule" style={{ maxWidth: `${72 - index * 9}%` }} />
          <span className="ml-auto h-2 w-12 rounded-full bg-rule" />
        </li>
      ))}
    </ul>
  );
}
