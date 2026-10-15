"use client";

import { motion } from "motion/react";
import { useMemo, type ReactNode, type Ref } from "react";
import { useMotionPrefs } from "@/components/motion/MotionPreferences";
import { PriceDelta } from "@/components/quote/PriceDelta";
import { VerdictBadge } from "@/components/quote/VerdictBadge";
import { Button, ButtonLink, buttonClasses } from "@/components/ui/Button";
import { CheckGlyph } from "@/components/ui/icons";
import { Tag, type TagTone } from "@/components/ui/Tag";
import type { AnalysisData } from "@/lib/analysis/live-state";
import type { Finding, PriceOpinion, SavingsRange } from "@/lib/analysis/result";
import {
  groupFindings,
  quotedPriceText,
  referenceText,
  savingsRelyOnAi,
  savingsText,
} from "@/lib/analysis/result-view";
import { cn } from "@/lib/cn";
import type { Extraction } from "@/lib/extraction/schema";
import { formatEuros, formatShortDate } from "@/lib/format";
import { offsets, reducedFade, transitions } from "@/lib/motion";
import { buildNegotiation } from "@/lib/negotiation";
import { fr } from "@/lib/typography";
import { DeleteAnalysis } from "./DeleteAnalysis";
import { DetailedReport } from "./DetailedReport";
import { NegotiationMessage } from "./NegotiationMessage";
import { ShareLink } from "./ShareLink";

function plural(count: number, one: string, many: string): string {
  return `${count} ${count > 1 ? many : one}`;
}

const MESSAGE_ANCHOR = "message-a-envoyer";

/** Le message de négociation, s'il y a de quoi en écrire un (seulement des points vérifiés). */
function useNegotiation(data: AnalysisData) {
  const { extraction } = data;
  const findings = useMemo(() => data.findings ?? [], [data.findings]);
  const prices = useMemo(() => data.prices ?? [], [data.prices]);
  const message = useMemo(
    () => (extraction ? buildNegotiation({ extraction, findings, prices }) : null),
    [extraction, findings, prices],
  );
  return { findings, prices, message };
}

/** Apparition d'un bloc de la conclusion. */
function useAppear() {
  const { reduced } = useMotionPrefs();
  return {
    initial: { opacity: 0, y: offsets.lineRiseY },
    animate: { opacity: 1, y: 0 },
    transition: reduced ? reducedFade() : transitions.message(),
  };
}

/**
 * L'économie en grand : « jusqu'à » en petit devant le montant, ou la
 * fourchette entière (« 120 à 219 € »).
 */
export function SavingsFigure({ savings, className }: { readonly savings: SavingsRange; readonly className?: string }) {
  const upTo = savings.low <= 0 && savings.low !== savings.high;
  return (
    <p className={cn("flex flex-wrap items-baseline gap-x-2 text-brand-strong", className)}>
      {upTo ? <span className="text-lg font-medium">{fr("jusqu'à")}</span> : null}
      <span className="text-[2.75rem] font-semibold leading-none tracking-[-0.03em] tabular-nums">
        {upTo ? formatEuros(savings.high, 0) : savingsText(savings)}
      </span>
    </p>
  );
}

interface ResultSummaryProps {
  readonly data: AnalysisData;
  /** Vrai une fois l'analyse supprimée : plus d'échéance à annoncer. */
  readonly deleted?: boolean;
  readonly headingRef?: Ref<HTMLHeadingElement>;
  /** Analyse en direct : « Analyser un autre devis » repart sans recharger. */
  readonly onRestart?: () => void;
}

/**
 * Le résumé d'une analyse, en premier : le verdict en petit, l'économie
 * possible en grand, les points clés et le chemin vers le message.
 */
export function ResultSummary({ data, deleted = false, headingRef, onRestart }: ResultSummaryProps) {
  const appear = useAppear();
  const { prices, message } = useNegotiation(data);
  const { verdict, extraction } = data;
  if (!verdict || !extraction) return null;
  const expiresAt = data.analysisId && data.expiresAt && !deleted ? new Date(data.expiresAt) : null;

  return (
    <motion.section
      aria-labelledby="issue-analyse"
      className="rounded-lg border border-rule bg-paper-raised p-6 elevation-1"
      {...appear}
    >
      <h2 id="issue-analyse" ref={headingRef} tabIndex={-1} className="text-sm font-semibold text-ink-muted outline-none">
        Le verdict de Loupe
      </h2>
      <VerdictBadge verdict={verdict.verdict} size="lg" className="mt-2" />

      {verdict.savings ? (
        <div className="mt-6">
          <p className="text-sm text-ink-muted">Vous pouvez économiser</p>
          <SavingsFigure savings={verdict.savings} className="mt-1" />
          {savingsRelyOnAi(prices) ? (
            <p className="mt-2 text-sm text-ink-muted">
              {fr("Le haut de cette fourchette vient d'une estimation IA, à prendre avec prudence.")}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-5 text-[1.0625rem] leading-relaxed text-ink">
          {verdict.verdict === "ok"
            ? fr("Ce devis nous paraît correct : rien d'anormal dans les calculs ni dans les mentions.")
            : fr("Pas d'économie chiffrée, mais des points à éclaircir avec l'artisan.")}
        </p>
      )}

      {verdict.keyPoints.length > 0 ? (
        <ul className="mt-6 space-y-2.5 border-t border-rule pt-5">
          {verdict.keyPoints.map((point) => (
            <li key={point} className="flex gap-2.5 text-[0.95rem] leading-relaxed text-ink">
              <span aria-hidden className="mt-[0.55em] size-1.5 shrink-0 rounded-[0.2rem] bg-ink-muted" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {extraction.readability === "partial" ? (
        <p className="mt-4 rounded-md bg-mist px-3 py-2 text-sm text-ink-muted">
          {fr("Une partie du devis était difficile à lire. Comparez les montants avec votre exemplaire papier.")}
        </p>
      ) : null}

      <div className="mt-6 flex flex-col gap-3">
        {message ? (
          <a href={`#${MESSAGE_ANCHOR}`} className={buttonClasses("primary", "lg", "w-full")}>
            Préparer mon message
          </a>
        ) : null}
        {onRestart ? (
          <Button variant={message ? "secondary" : "primary"} size="lg" className="w-full" onClick={onRestart}>
            Analyser un autre devis
          </Button>
        ) : (
          <ButtonLink href="/analyse" variant={message ? "secondary" : "primary"} size="lg" className="w-full">
            Analyser un autre devis
          </ButtonLink>
        )}
      </div>
      {data.remaining !== null && onRestart ? (
        <p className="mt-3 text-center text-sm text-ink-muted">
          {data.remaining === 0
            ? "C'était votre dernière analyse du jour."
            : fr(`Il vous reste ${plural(data.remaining, "analyse", "analyses")} aujourd'hui.`)}
        </p>
      ) : null}
      {expiresAt ? (
        <p className="mt-4 border-t border-rule pt-4 text-sm leading-relaxed text-ink-muted">
          {fr(
            `Gardez cette page dans vos favoris : elle reste accessible jusqu'au ${formatShortDate(expiresAt)}, puis elle sera effacée. Sans le lien, personne ne peut la retrouver.`,
          )}
        </p>
      ) : null}
    </motion.section>
  );
}

/**
 * Le détail d'une analyse, sous le devis : erreurs vérifiées, chiffres à
 * confirmer, avis sur les prix, points d'attention, rappels, puis le message
 * à envoyer et la suite. Les erreurs vérifiées et les avis de prix restent
 * dans des blocs séparés : un calcul faux est un fait, un prix est un avis.
 */
export function ResultDetails({
  data,
  deleted = false,
  onDeleted,
}: {
  readonly data: AnalysisData;
  /** Vrai une fois l'analyse supprimée : ce qui renvoie vers elle disparaît. */
  readonly deleted?: boolean;
  readonly onDeleted?: () => void;
}) {
  const appear = useAppear();
  const { findings, prices, message } = useNegotiation(data);
  const { verdict, extraction } = data;
  if (!verdict || !extraction) return null;
  const groups = groupFindings(findings);

  return (
    <motion.div className="space-y-6" {...appear}>
      <ResultBlock
        title="Erreurs vérifiées"
        tag={groups.errors.length > 0 ? { tone: "error", text: plural(groups.errors.length, "erreur", "erreurs") } : undefined}
      >
        {groups.errors.length > 0 ? (
          <FindingList findings={groups.errors} extraction={extraction} />
        ) : (
          <p className="flex items-start gap-2.5 leading-relaxed text-ink">
            <CheckGlyph className="mt-0.5 shrink-0 text-brand-strong" />
            {fr("Les calculs tombent juste et les mentions essentielles sont présentes.")}
          </p>
        )}
      </ResultBlock>

      {groups.toConfirm.length > 0 ? (
        <ResultBlock
          title="À confirmer sur votre devis"
          tag={{ tone: "unconfirmed", text: "À vérifier" }}
          intro={fr("Ces chiffres étaient difficiles à lire. Vérifiez-les sur le papier avant d'en parler à l'artisan.")}
        >
          <FindingList findings={groups.toConfirm} extraction={extraction} />
        </ResultBlock>
      ) : null}

      <ResultBlock
        title="Avis sur les prix"
        tag={{ tone: "estimate", text: "Repères" }}
        intro={fr("Ce sont des repères, pas des erreurs. Chaque avis indique sa source et le crédit qu'on peut lui accorder.")}
      >
        {prices.length > 0 ? (
          <ul className="divide-y divide-rule">
            {prices.map((opinion) => (
              <PriceItem key={opinion.lineIndex} opinion={opinion} extraction={extraction} />
            ))}
          </ul>
        ) : (
          <p className="leading-relaxed text-ink-muted">
            {fr(
              "Pour l'instant, trop peu de devis semblables dans votre région, et des lignes trop particulières pour une estimation fiable.",
            )}
          </p>
        )}
        {!data.pricesComplete ? (
          <p className="mt-3 text-sm text-ink-muted">{fr("Quelques lignes n'ont pas pu être comparées.")}</p>
        ) : null}
      </ResultBlock>

      {groups.warnings.length > 0 ? (
        <ResultBlock title="Points d'attention" tag={{ tone: "warning", text: plural(groups.warnings.length, "point", "points") }}>
          <FindingList findings={groups.warnings} extraction={extraction} />
        </ResultBlock>
      ) : null}

      {groups.reminders.length > 0 ? (
        <ResultBlock title="Bon à savoir" tag={{ tone: "reminder", text: "Rappel" }}>
          <FindingList findings={groups.reminders} extraction={extraction} />
        </ResultBlock>
      ) : null}

      <section
        id={MESSAGE_ANCHOR}
        aria-labelledby="titre-message"
        className="scroll-mt-6 rounded-lg border border-rule bg-paper-raised p-5 sm:p-6"
      >
        <h2 id="titre-message" className="font-display text-[1.75rem] leading-tight text-ink">
          {fr("Le message à envoyer")}
        </h2>
        {message ? (
          <>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">
              {fr(
                "Il ne reprend que les points vérifiés, jamais une estimation IA. Relisez-le et adaptez-le à votre façon de parler avant de l'envoyer.",
              )}
            </p>
            <div className="mt-5">
              <NegotiationMessage message={message} />
            </div>
          </>
        ) : (
          <p className="mt-2 leading-relaxed text-ink-muted">
            {verdict.verdict === "ok"
              ? fr("Rien à négocier : nous n'avons trouvé aucune raison de discuter ce devis.")
              : fr(
                  "Nous ne proposons pas de message : les points relevés reposent sur une estimation IA ou sur des chiffres mal lus. Vérifiez-les d'abord sur votre devis.",
                )}
          </p>
        )}
      </section>

      <section aria-labelledby="titre-suite" className="rounded-lg bg-mist p-5 sm:p-6">
        <h2 id="titre-suite" className="font-display text-[1.75rem] leading-tight text-ink">
          {fr("Et maintenant ?")}
        </h2>
        <div className="mt-5 space-y-6">
          {data.analysisId && !deleted ? <ShareLink analysisId={data.analysisId} expiresAt={data.expiresAt} /> : null}
          <DetailedReport />
          {data.analysisId ? <DeleteAnalysis analysisId={data.analysisId} onDeleted={onDeleted} /> : null}
        </div>
      </section>
    </motion.div>
  );
}

function ResultBlock({
  title,
  tag,
  intro,
  children,
}: {
  readonly title: string;
  readonly tag?: { readonly tone: TagTone; readonly text: string };
  readonly intro?: string;
  readonly children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-rule bg-paper-raised p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold text-ink">{fr(title)}</h2>
        {tag ? <Tag tone={tag.tone}>{tag.text}</Tag> : null}
      </div>
      {intro ? <p className="mt-1 text-sm leading-relaxed text-ink-muted">{intro}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function lineLabel(extraction: Extraction, index: number | undefined): string | null {
  if (index === undefined) return null;
  return extraction.lines[index]?.label ?? `Ligne ${index + 1}`;
}

function FindingList({ findings, extraction }: { readonly findings: readonly Finding[]; readonly extraction: Extraction }) {
  return (
    <ul className="divide-y divide-rule">
      {findings.map((finding) => {
        const label = lineLabel(extraction, finding.lineIndex);
        return (
          <li key={finding.id} className="py-3 leading-relaxed text-ink first:pt-0 last:pb-0">
            {label ? <span className="block text-sm font-medium text-ink-muted">{fr(label)}</span> : null}
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
    <li className="grid gap-x-6 gap-y-2 py-4 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <p className="font-medium text-ink">{fr(lineLabel(extraction, opinion.lineIndex) ?? "")}</p>
        <p className="mt-0.5 font-mono text-sm tabular-nums text-ink-muted">
          {fr("Votre devis : ")}
          {quotedPriceText(opinion)}
        </p>
        <p className="font-mono text-sm tabular-nums text-ink-muted">{referenceText(opinion)}</p>
      </div>
      <PriceDelta amount={opinion.delta} source={opinion.source} />
    </li>
  );
}
