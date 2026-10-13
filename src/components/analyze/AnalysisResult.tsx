"use client";

import { motion } from "motion/react";
import type { ReactNode, Ref } from "react";
import { useMotionPrefs } from "@/components/motion/MotionPreferences";
import { PriceDelta } from "@/components/signature/PriceDelta";
import { Stamp } from "@/components/signature/Stamp";
import { Button } from "@/components/ui/Button";
import type { LiveState } from "@/lib/analysis/live-state";
import type { Finding, PriceOpinion } from "@/lib/analysis/result";
import {
  groupFindings,
  quotedPriceText,
  referenceText,
  savingsRelyOnAi,
  savingsText,
} from "@/lib/analysis/result-view";
import { cn } from "@/lib/cn";
import type { Extraction } from "@/lib/extraction/schema";
import { offsets, reducedFade, transitions } from "@/lib/motion";
import { describeSource } from "@/lib/price-wording";
import { fr } from "@/lib/typography";

function plural(count: number, one: string, many: string): string {
  return `${count} ${count > 1 ? many : one}`;
}

interface AnalysisResultProps {
  readonly state: LiveState;
  readonly headingRef: Ref<HTMLHeadingElement>;
  readonly onRestart: () => void;
}

/**
 * La conclusion d'une analyse : le tampon, l'économie possible et les points
 * clés, puis le détail. Les erreurs vérifiées et les avis de prix restent
 * dans des blocs séparés : un calcul faux est un fait, un prix est un avis.
 */
export function AnalysisResult({ state, headingRef, onRestart }: AnalysisResultProps) {
  const { reduced } = useMotionPrefs();
  const { verdict, extraction } = state;
  if (!verdict || !extraction) return null;
  const findings = state.findings ?? [];
  const prices = state.prices ?? [];
  const groups = groupFindings(findings);
  const stampId = state.analysisId ?? `${extraction.category}-${extraction.lines.length}`;

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: offsets.lineRiseY }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? reducedFade() : transitions.message()}
    >
      <section
        aria-labelledby="issue-analyse"
        className="rounded-[4px] border border-rule bg-paper-raised p-5 sm:p-6"
      >
        <div className="flex flex-col-reverse gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2
              id="issue-analyse"
              ref={headingRef}
              tabIndex={-1}
              className="font-display text-[1.75rem] leading-tight text-ink outline-none"
            >
              {fr("Le verdict de Loupe")}
            </h2>
            {verdict.savings ? (
              <p className="mt-2 text-[1.0625rem] text-ink">
                {fr("Économie possible : ")}
                <strong className="font-mono font-semibold tabular-nums">{savingsText(verdict.savings)}</strong>
              </p>
            ) : null}
            {verdict.savings && savingsRelyOnAi(prices) ? (
              <p className="mt-1 text-sm text-ink-muted">
                {fr("Le haut de la fourchette repose sur une estimation IA, à confiance faible.")}
              </p>
            ) : null}
          </div>
          <Stamp verdict={verdict.verdict} id={stampId} className="shrink-0 self-start sm:mt-1" />
        </div>

        {verdict.keyPoints.length > 0 ? (
          <ol className="mt-5 space-y-2 border-t border-rule pt-5">
            {verdict.keyPoints.map((point, index) => (
              <li key={point} className="flex gap-3 leading-relaxed text-ink">
                <span aria-hidden className="font-mono text-sm leading-[1.65] text-ink-muted">
                  {index + 1}.
                </span>
                <span>{point}</span>
              </li>
            ))}
          </ol>
        ) : null}

        {extraction.readability === "partial" ? (
          <p className="mt-4 text-sm text-ink-muted">
            {fr("Certaines zones étaient difficiles à lire : compare les montants avec ton devis papier.")}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button onClick={onRestart}>Analyser un autre devis</Button>
          {state.remaining !== null ? (
            <p className="text-sm text-ink-muted">
              {state.remaining === 0
                ? "C'était ta dernière analyse du jour."
                : fr(`Il te reste ${plural(state.remaining, "analyse", "analyses")} aujourd'hui.`)}
            </p>
          ) : null}
        </div>
      </section>

      <ResultBlock title="Erreurs vérifiées" tone="red">
        {groups.errors.length > 0 ? (
          <FindingList findings={groups.errors} extraction={extraction} />
        ) : (
          <p className="text-ink-muted">
            {fr("Aucune erreur trouvée dans les calculs ni dans les mentions essentielles.")}
          </p>
        )}
      </ResultBlock>

      {groups.toConfirm.length > 0 ? (
        <ResultBlock
          title="À confirmer sur ton devis"
          intro={fr("Ces chiffres étaient difficiles à lire : vérifie-les sur le papier avant d'en parler.")}
        >
          <FindingList findings={groups.toConfirm} extraction={extraction} />
        </ResultBlock>
      ) : null}

      <ResultBlock
        title="Avis sur les prix"
        intro={fr("Des repères, pas des certitudes : chaque avis dit d'où il vient et à quel point s'y fier.")}
      >
        {prices.length > 0 ? (
          <ul className="divide-y divide-rule">
            {prices.map((opinion) => (
              <PriceItem key={opinion.lineIndex} opinion={opinion} extraction={extraction} />
            ))}
          </ul>
        ) : (
          <p className="text-ink-muted">
            {fr(
              "Rien à comparer cette fois : pas assez de devis comparables dans ta région, et des lignes trop particulières pour une estimation.",
            )}
          </p>
        )}
        {!state.pricesComplete ? (
          <p className="mt-3 text-sm text-ink-muted">
            {fr("Certaines lignes n'ont pas pu être comparées cette fois-ci.")}
          </p>
        ) : null}
      </ResultBlock>

      {groups.warnings.length > 0 ? (
        <ResultBlock title="Points d'attention">
          <FindingList findings={groups.warnings} extraction={extraction} />
        </ResultBlock>
      ) : null}

      {groups.reminders.length > 0 ? (
        <ResultBlock title="Bon à savoir" tone="blue">
          <FindingList findings={groups.reminders} extraction={extraction} />
        </ResultBlock>
      ) : null}
    </motion.div>
  );
}

const TONES = {
  ink: "border-l-rule-strong",
  red: "border-l-pen-red",
  blue: "border-l-annotation-blue",
} as const;

function ResultBlock({
  title,
  intro,
  tone = "ink",
  children,
}: {
  readonly title: string;
  readonly intro?: string;
  readonly tone?: keyof typeof TONES;
  readonly children: ReactNode;
}) {
  return (
    <section className={cn("border-l-2 pl-4 sm:pl-5", TONES[tone])}>
      <h3 className="font-display text-[1.45rem] leading-tight text-ink">{fr(title)}</h3>
      {intro ? <p className="mt-1 text-sm text-ink-muted">{intro}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function lineLabel(extraction: Extraction, index: number | undefined): string | null {
  if (index === undefined) return null;
  return extraction.lines[index]?.label ?? `Ligne ${index + 1}`;
}

function FindingList({
  findings,
  extraction,
}: {
  readonly findings: readonly Finding[];
  readonly extraction: Extraction;
}) {
  return (
    <ul className="space-y-3">
      {findings.map((finding) => {
        const label = lineLabel(extraction, finding.lineIndex);
        return (
          <li key={finding.id} className="leading-relaxed text-ink">
            {label ? (
              <span className="block font-mono text-label uppercase text-ink-muted">{fr(label)}</span>
            ) : null}
            <span className="block">{finding.detail}</span>
            {finding.legalRef && finding.ruleVerified ? (
              <span className="mt-0.5 block text-sm text-ink-muted">{finding.legalRef}</span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function PriceItem({ opinion, extraction }: { readonly opinion: PriceOpinion; readonly extraction: Extraction }) {
  const inRange = opinion.source.kind === "ai" && Math.round(opinion.delta) === 0;
  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <p className="font-medium text-ink">{fr(lineLabel(extraction, opinion.lineIndex) ?? "")}</p>
      <p className="mt-0.5 font-mono text-sm tabular-nums text-ink-muted">
        {fr("Ton devis : ")}
        {quotedPriceText(opinion)}
      </p>
      <p className="font-mono text-sm tabular-nums text-ink-muted">{referenceText(opinion)}</p>
      {inRange ? (
        <div className="mt-2 text-sm leading-snug">
          <p className="text-ink">{fr("Dans la fourchette de l'estimation IA.")}</p>
          <p className="mt-1 font-mono text-label uppercase text-ink-muted">{describeSource(opinion.source)}</p>
        </div>
      ) : (
        <PriceDelta amount={opinion.delta} source={opinion.source} className="mt-2" />
      )}
    </li>
  );
}
