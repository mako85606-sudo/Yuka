"use client";

import { motion } from "motion/react";
import { useMemo, useState, type ReactNode, type Ref } from "react";
import { useMotionPrefs } from "@/components/motion/MotionPreferences";
import { PriceDelta } from "@/components/signature/PriceDelta";
import { Button, ButtonLink, buttonClasses } from "@/components/ui/Button";
import type { AnalysisData } from "@/lib/analysis/live-state";
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
import { formatShortDate } from "@/lib/format";
import { offsets, reducedFade, transitions } from "@/lib/motion";
import { buildNegotiation } from "@/lib/negotiation";
import { VERDICT_LABELS, type Verdict } from "@/lib/scene-quote";
import { fr } from "@/lib/typography";
import { DeleteAnalysis } from "./DeleteAnalysis";
import { DetailedReport } from "./DetailedReport";
import { NegotiationMessage } from "./NegotiationMessage";
import { ShareLink } from "./ShareLink";

function plural(count: number, one: string, many: string): string {
  return `${count} ${count > 1 ? many : one}`;
}

const VERDICT_INK: Record<Verdict, string> = {
  ok: "text-verdict-ok",
  negotiate: "text-verdict-negotiate",
  alert: "text-verdict-alert",
};

const MESSAGE_ANCHOR = "message-a-envoyer";

interface AnalysisResultProps {
  readonly data: AnalysisData;
  readonly headingRef?: Ref<HTMLHeadingElement>;
  /** Analyse en direct : « Analyser un autre devis » repart sans recharger. */
  readonly onRestart?: () => void;
}

/**
 * La conclusion d'une analyse, sous la feuille corrigée : le verdict en
 * clair, l'économie possible et les points clés, puis le détail et le
 * message à envoyer. Les erreurs vérifiées et les avis de prix restent dans
 * des blocs séparés : un calcul faux est un fait, un prix est un avis.
 */
export function AnalysisResult({ data, headingRef, onRestart }: AnalysisResultProps) {
  const { reduced } = useMotionPrefs();
  const [deleted, setDeleted] = useState(false);
  const { verdict, extraction } = data;
  const findings = useMemo(() => data.findings ?? [], [data.findings]);
  const prices = useMemo(() => data.prices ?? [], [data.prices]);
  const message = useMemo(
    () => (extraction ? buildNegotiation({ extraction, findings, prices }) : null),
    [extraction, findings, prices],
  );
  if (!verdict || !extraction) return null;
  const groups = groupFindings(findings);
  const expiresAt = data.analysisId && data.expiresAt && !deleted ? new Date(data.expiresAt) : null;

  return (
    <motion.div
      className="space-y-8"
      initial={{ opacity: 0, y: offsets.lineRiseY }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? reducedFade() : transitions.message()}
    >
      <section aria-labelledby="issue-analyse" className="rounded-[4px] border border-rule bg-paper-raised p-5 sm:p-6">
        <h2
          id="issue-analyse"
          ref={headingRef}
          tabIndex={-1}
          className="font-mono text-label uppercase text-ink-muted outline-none"
        >
          Le verdict de Loupe
        </h2>
        <p className={cn("mt-2 font-display text-[2rem] leading-tight", VERDICT_INK[verdict.verdict])}>
          {VERDICT_LABELS[verdict.verdict]}
        </p>
        {verdict.savings ? (
          <p className="mt-2 text-[1.0625rem] text-ink">
            {fr("Économie possible : ")}
            <strong className="font-mono font-semibold tabular-nums">{savingsText(verdict.savings)}</strong>
          </p>
        ) : null}
        {verdict.savings && savingsRelyOnAi(prices) ? (
          <p className="mt-1 text-sm text-ink-muted">
            {fr("Le haut de cette fourchette vient d'une estimation IA, à prendre avec prudence.")}
          </p>
        ) : null}

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
            {fr("Une partie du devis était difficile à lire. Compare les montants avec ton exemplaire papier.")}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {message ? (
            <a href={`#${MESSAGE_ANCHOR}`} className={buttonClasses("primary")}>
              Préparer mon message
            </a>
          ) : null}
          {onRestart ? (
            <Button variant={message ? "secondary" : "primary"} onClick={onRestart}>
              Analyser un autre devis
            </Button>
          ) : (
            <ButtonLink href="/analyse" variant={message ? "secondary" : "primary"}>
              Analyser un autre devis
            </ButtonLink>
          )}
          {data.remaining !== null && onRestart ? (
            <p className="text-sm text-ink-muted">
              {data.remaining === 0
                ? "C'était ta dernière analyse du jour."
                : fr(`Il te reste ${plural(data.remaining, "analyse", "analyses")} aujourd'hui.`)}
            </p>
          ) : null}
        </div>
        {expiresAt ? (
          <p className="mt-4 text-sm text-ink-muted">
            {fr(
              `Garde cette page dans tes favoris : elle reste accessible jusqu'au ${formatShortDate(expiresAt)}, puis elle sera effacée. Sans le lien, personne ne peut la retrouver.`,
            )}
          </p>
        ) : null}
      </section>

      <ResultBlock title="Erreurs vérifiées" tone="red">
        {groups.errors.length > 0 ? (
          <FindingList findings={groups.errors} extraction={extraction} />
        ) : (
          <p className="text-ink-muted">
            {fr("Les calculs tombent juste et les mentions essentielles sont là.")}
          </p>
        )}
      </ResultBlock>

      {groups.toConfirm.length > 0 ? (
        <ResultBlock
          title="À confirmer sur ton devis"
          intro={fr("On a eu du mal à lire ces chiffres. Vérifie-les sur le papier avant d'en parler à l'artisan.")}
        >
          <FindingList findings={groups.toConfirm} extraction={extraction} />
        </ResultBlock>
      ) : null}

      <ResultBlock
        title="Avis sur les prix"
        intro={fr("Ce sont des repères. Chaque avis indique sa source et le crédit qu'on peut lui accorder.")}
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
              "Pour l'instant, trop peu de devis semblables dans ta région, et des lignes trop particulières pour une estimation fiable.",
            )}
          </p>
        )}
        {!data.pricesComplete ? (
          <p className="mt-3 text-sm text-ink-muted">
            {fr("Quelques lignes n'ont pas pu être comparées.")}
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

      <section
        id={MESSAGE_ANCHOR}
        aria-labelledby="titre-message"
        className="scroll-mt-6 rounded-[4px] border border-rule bg-paper-raised p-5 sm:p-6"
      >
        <h3 id="titre-message" className="font-display text-[1.6rem] leading-tight text-ink">
          {fr("Le message à envoyer")}
        </h3>
        {message ? (
          <>
            <p className="mt-1 text-sm text-ink-muted">
              {fr(
                "Il ne reprend que les points vérifiés, jamais une estimation IA. Relis-le et adapte-le à ta façon de parler avant de l'envoyer.",
              )}
            </p>
            <div className="mt-4">
              <NegotiationMessage message={message} />
            </div>
          </>
        ) : (
          <p className="mt-2 leading-relaxed text-ink-muted">
            {verdict.verdict === "ok"
              ? fr("Rien à négocier. On n'a trouvé aucune raison de discuter ce devis.")
              : fr(
                  "On ne te propose pas de message : les points relevés reposent sur une estimation IA ou sur des chiffres mal lus. Vérifie-les d'abord sur ton devis.",
                )}
          </p>
        )}
      </section>

      <section aria-labelledby="titre-suite" className="space-y-6 border-t border-rule pt-6">
        <h3 id="titre-suite" className="font-display text-[1.45rem] leading-tight text-ink">
          {fr("Et maintenant ?")}
        </h3>
        {data.analysisId && !deleted ? <ShareLink analysisId={data.analysisId} expiresAt={data.expiresAt} /> : null}
        <DetailedReport />
        {data.analysisId ? <DeleteAnalysis analysisId={data.analysisId} onDeleted={() => setDeleted(true)} /> : null}
      </section>
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
  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <p className="font-medium text-ink">{fr(lineLabel(extraction, opinion.lineIndex) ?? "")}</p>
      <p className="mt-0.5 font-mono text-sm tabular-nums text-ink-muted">
        {fr("Ton devis : ")}
        {quotedPriceText(opinion)}
      </p>
      <p className="font-mono text-sm tabular-nums text-ink-muted">{referenceText(opinion)}</p>
      <PriceDelta amount={opinion.delta} source={opinion.source} className="mt-2" />
    </li>
  );
}
