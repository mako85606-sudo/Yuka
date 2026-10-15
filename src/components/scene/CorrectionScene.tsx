"use client";

import { motion } from "motion/react";
import { useMemo } from "react";
import { useMotionPrefs } from "@/components/motion/MotionPreferences";
import { GhostLines } from "@/components/quote/GhostLines";
import { HeaderPlaceholder } from "@/components/quote/HeaderPlaceholder";
import { QuoteHeader } from "@/components/quote/QuoteHeader";
import { QuoteLine, type QuoteLineIssue } from "@/components/quote/QuoteLine";
import { QuoteTotals, type QuoteTotalIssue } from "@/components/quote/QuoteTotals";
import { SheetRemarks } from "@/components/quote/SheetRemarks";
import { VerdictBadge } from "@/components/quote/VerdictBadge";
import type { TagTone } from "@/components/ui/Tag";
import { issuesSchedule, lineSchedule, priceSchedule, verdictBeats } from "@/lib/choreography";
import { cn } from "@/lib/cn";
import { offsets, reducedFade, transitions } from "@/lib/motion";
import { hasReached, type ScenePhase } from "@/lib/phases";
import {
  annotationCount,
  issueSeverity,
  type CorrectionQuote,
  type IssueSeverity,
  type SceneIssue,
} from "@/lib/scene-quote";

interface CorrectionSceneProps {
  readonly quote: CorrectionQuote;
  /** Étape atteinte : chaque bloc s'anime quand son étape arrive. */
  readonly phase: ScenePhase;
  /**
   * Lecture en direct : les lignes apparaissent au moment où elles sont lues
   * (sans décalage calculé), et des lignes fantômes attendent la suite.
   */
  readonly live?: boolean;
  /** Joue l'arrivée de la carte au montage. Faux : déjà posée. */
  readonly entrance?: boolean;
  /** Version resserrée, pour une petite carte. */
  readonly compact?: boolean;
  /** Nom accessible de la carte. */
  readonly label?: string;
  /** Niveau du titre du devis (`h3` par défaut). */
  readonly titleAs?: "h2" | "h3";
  readonly className?: string;
}

/** La pastille d'un constat sur une ligne : ce qu'elle dit, sa couleur, et si le montant est barré. */
function lineTag(issue: SceneIssue): Pick<QuoteLineIssue, "tag" | "tone" | "strike"> {
  const severity = issueSeverity(issue);
  if (severity === "unconfirmed") return { tag: "À vérifier", tone: "unconfirmed", strike: false };
  if (issue.kind === "calculation") return { tag: "Erreur de calcul", tone: "error", strike: severity === "error" };
  if (issue.kind === "vague-line") return { tag: "À préciser", tone: "warning", strike: false };
  return { tag: "Attention", tone: "warning", strike: false };
}

/** La pastille d'un total faux (les totaux sont des calculs). */
function totalTag(severity: IssueSeverity): { readonly tag: string; readonly tone: TagTone } {
  if (severity === "unconfirmed") return { tag: "À vérifier", tone: "unconfirmed" };
  return severity === "error" ? { tag: "Erreur de calcul", tone: "error" } : { tag: "Attention", tone: "warning" };
}

/**
 * Le devis lu et vérifié, sur une carte : l'en-tête, les lignes au fil de la
 * lecture, puis les constats (ligne surlignée, pastille, note ; montant faux
 * barré et bon montant à côté), les avis de prix (avec leur source) et le
 * verdict en pastille.
 *
 * Tout ce qui est connu est posé dès le départ, invisible : la mise en page ne
 * bouge pas pendant la vérification, seuls opacité et transformations
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
  label = "Devis lu par Loupe",
  titleAs,
  className,
}: CorrectionSceneProps) {
  const { reduced } = useMotionPrefs();
  const totalIssues = quote.totalIssues ?? [];
  const remarks = quote.remarks ?? [];

  const lineTimes = useMemo(() => lineSchedule(quote.lines.length, { reduced }), [quote.lines.length, reduced]);
  // Un seul calendrier pour toute la vérification : lignes, puis totaux, puis remarques.
  const gestures = annotationCount(quote);
  const issueTimes = useMemo(() => issuesSchedule(gestures, { reduced }), [gestures, reduced]);
  const priceTimes = useMemo(() => priceSchedule(quote.prices.length, { reduced }), [quote.prices.length, reduced]);
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
    <motion.section
      aria-label={label}
      className={cn("relative overflow-hidden rounded-lg border border-rule bg-paper-raised elevation-1", className)}
      initial={entrance ? { opacity: 0, y: offsets.lineRiseY * 2 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? reducedFade() : transitions.sheetDrop()}
    >
      {/* Pendant la lecture : une barre verte qui court en haut de la carte. */}
      <div aria-hidden className="absolute inset-x-0 top-0 h-[3px] overflow-hidden motion-reduce:hidden">
        <motion.span
          className="absolute inset-y-0 left-0 w-1/3 bg-brand"
          initial={{ opacity: 0, x: "-100%" }}
          animate={phase === "reading" ? { opacity: 1, x: "300%" } : { opacity: 0, x: "-100%" }}
          transition={phase === "reading" ? transitions.scan : transitions.micro}
        />
      </div>

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
          titleAs={titleAs}
          verdict={
            quote.verdict ? (
              <VerdictBadge verdict={quote.verdict} active={verdictActive} delay={verdict.stamp.start} />
            ) : null
          }
        />
      )}

      <div className={cn("mt-5 flex justify-between border-b border-rule pb-2 text-xs font-medium text-ink-muted", compact ? "px-5" : "px-5 sm:px-7")}>
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
                        ...lineTag(issue),
                        note: issue.note,
                        detail: issue.detail,
                        beats: issueBeats,
                        active: issuesActive,
                      }
                    : undefined
                }
                price={
                  price && priceTime
                    ? { delta: price.delta, source: price.source, delay: priceTime.start, active: pricesActive }
                    : undefined
                }
              />
            );
          })}
        </ol>
      ) : null}
      {reading ? <GhostLines count={quote.lines.length > 0 ? 1 : undefined} /> : null}
      {!reading && quote.lines.length === 0 ? (
        <p className={cn("py-6 text-sm text-ink-muted", compact ? "px-5" : "px-5 sm:px-7")}>Aucune ligne lue.</p>
      ) : null}

      {quote.totals ? (
        <QuoteTotals
          totals={quote.totals}
          vatRate={quote.vatRate}
          revealed={linesRevealed}
          delay={live ? 0 : (lastLine?.start ?? 0)}
          compact={compact}
          issues={totalIssues.flatMap((issue, index): QuoteTotalIssue[] => {
            const beats = issueTimes[totalsOffset + index];
            return beats
              ? [
                  {
                    id: issue.id,
                    row: issue.row,
                    ...totalTag(issue.severity),
                    note: issue.note,
                    detail: issue.detail,
                    beats,
                    active: issuesActive,
                  },
                ]
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
    </motion.section>
  );
}
