"use client";

import { motion } from "motion/react";
import { useMotionPrefs } from "@/components/motion/MotionPreferences";
import { HighlighterMark } from "@/components/signature/HighlighterMark";
import { MarginNote } from "@/components/signature/MarginNote";
import { PaperSheet } from "@/components/signature/PaperSheet";
import { PriceDelta } from "@/components/signature/PriceDelta";
import { RedCircle } from "@/components/signature/RedCircle";
import { Stamp } from "@/components/signature/Stamp";
import { endOf, issuesSchedule, priceSchedule, verdictBeats } from "@/lib/choreography";
import { demoSavingsText, type DemoQuote } from "@/lib/demo-outcome";
import { formatAmount, formatQuantity } from "@/lib/format";
import { durations, reducedFade, transitions } from "@/lib/motion";
import { issueSeverity } from "@/lib/scene-quote";
import { fr } from "@/lib/typography";

/** Le geste commence un peu après l'arrivée de la carte au centre. */
const START = 0.15;

interface TradeCardProps {
  readonly quote: DemoQuote;
  /** Vrai quand la carte est arrivée à l'écran : elle se corrige, une seule fois. */
  readonly active: boolean;
}

/**
 * Un devis court corrigé sur une petite feuille : le problème entouré et
 * annoté, l'avis de prix, puis le tampon et l'économie possible. Décoratif :
 * le carrousel donne le même contenu en texte aux lecteurs d'écran.
 */
export function TradeCard({ quote, active }: TradeCardProps) {
  const { reduced } = useMotionPrefs();
  const issueTimes = issuesSchedule(quote.issues.length, { startAt: START, reduced });
  const lastIssue = issueTimes[issueTimes.length - 1];
  const pricesStart = lastIssue ? endOf(lastIssue.note) : START;
  const priceTimes = priceSchedule(quote.prices.length, { startAt: pricesStart, reduced });
  const lastPrice = priceTimes[priceTimes.length - 1];
  const verdict = verdictBeats({ startAt: (lastPrice ? endOf(lastPrice) : pricesStart) + durations.micro, reduced });
  const savings = demoSavingsText(quote);

  return (
    <PaperSheet entrance={false} label={`Exemple : ${quote.title}`}>
      <div className="flex min-h-[27.5rem] flex-col px-4 pb-4 pt-3.5">
        <p className="font-mono text-label uppercase text-ink-muted">{quote.category}</p>
        <p className="mt-1 font-display text-[1.4rem] leading-tight text-ink">{quote.title}</p>

        <ul className="mt-3 divide-y divide-rule">
          {quote.lines.map((line) => {
            const issueIndex = quote.issues.findIndex((issue) => issue.lineId === line.id);
            const issue = quote.issues[issueIndex];
            const beats = issueTimes[issueIndex];
            const priceIndex = quote.prices.findIndex((price) => price.lineId === line.id);
            const price = quote.prices[priceIndex];
            const priceTime = priceTimes[priceIndex];
            return (
              <li key={line.id} className="py-2">
                <div className="relative">
                  {issue && beats && issueSeverity(issue) !== "unconfirmed" ? (
                    <RedCircle id={issue.id} active={active} delay={beats.circle.start} className="-inset-x-2 -inset-y-2.5" />
                  ) : null}
                  <div className="relative isolate flex items-baseline gap-3 text-[0.85rem]">
                    {issue && beats ? (
                      <HighlighterMark id={issue.id} active={active} delay={beats.highlight.start} />
                    ) : null}
                    <span className="min-w-0 flex-1 leading-snug">{line.label}</span>
                    <span className="shrink-0 font-mono tabular-nums">{formatAmount(line.totalHT)}</span>
                  </div>
                  <p className="mt-0.5 font-mono text-xs tabular-nums text-ink-muted">
                    {`${formatQuantity(line.quantity)} ${line.unit} × ${formatAmount(line.unitPriceHT)}`}
                  </p>
                </div>
                {issue && beats ? (
                  <MarginNote id={issue.id} active={active} delay={beats.note.start} placement="below" className="mt-2">
                    {issue.note}
                  </MarginNote>
                ) : null}
                {price && priceTime ? (
                  <PriceDelta
                    amount={price.delta}
                    source={price.source}
                    active={active}
                    delay={priceTime.start}
                    size="sm"
                    className="mt-2"
                  />
                ) : null}
              </li>
            );
          })}
        </ul>

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-rule pt-3">
          <motion.p
            className="text-sm leading-snug text-ink"
            initial={{ opacity: 0 }}
            animate={{ opacity: active ? 1 : 0 }}
            transition={reduced ? reducedFade(verdict.impact) : transitions.fadeIn(verdict.impact)}
          >
            {savings ? (
              <>
                <span className="block font-mono text-label uppercase text-ink-muted">Économie possible</span>
                <span className="whitespace-nowrap font-mono text-[1.05rem] font-semibold tabular-nums">{savings}</span>
              </>
            ) : (
              fr("Rien à redire.")
            )}
          </motion.p>
          <Stamp verdict={quote.verdict} id={quote.id} active={active} delay={verdict.stamp.start} size="sm" />
        </div>
      </div>
    </PaperSheet>
  );
}
