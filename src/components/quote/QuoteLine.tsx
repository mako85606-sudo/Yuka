"use client";

import { motion, type Transition } from "motion/react";
import { useMotionPrefs } from "@/components/motion/MotionPreferences";
import { Tag, type TagTone } from "@/components/ui/Tag";
import type { IssueBeats } from "@/lib/choreography";
import { cn } from "@/lib/cn";
import { formatAmount, formatQuantity } from "@/lib/format";
import { offsets, reducedFade, transitions } from "@/lib/motion";
import type { PriceSource } from "@/lib/price-wording";
import { correctedLineTotal, type PrintedLine } from "@/lib/scene-quote";
import { PriceDelta } from "./PriceDelta";

export interface QuoteLineIssue {
  readonly id: string;
  /** Libellé de la pastille (« Erreur de calcul », « À préciser », « À vérifier »). */
  readonly tag: string;
  readonly tone: TagTone;
  /** Vrai pour une erreur de calcul sûre : le montant imprimé est barré, le bon montant écrit à côté. */
  readonly strike: boolean;
  readonly note: string;
  readonly detail: string;
  readonly beats: IssueBeats;
  /** Vrai quand l'étape de vérification est atteinte. */
  readonly active: boolean;
}

export interface QuoteLinePrice {
  readonly delta: number;
  readonly source: PriceSource;
  readonly delay: number;
  /** Vrai quand l'étape des prix est atteinte. */
  readonly active: boolean;
}

interface QuoteLineProps {
  readonly line: PrintedLine;
  /** Faux : la ligne attend, invisible (sa place est déjà réservée). */
  readonly revealed?: boolean;
  /** Délai d'apparition de la ligne, en secondes, compté depuis la révélation. */
  readonly delay?: number;
  /** Constat sur la ligne : fond surligné, pastille, note (et correction d'un calcul faux). */
  readonly issue?: QuoteLineIssue;
  /** Avis de prix, sous la ligne : jamais en rouge. */
  readonly price?: QuoteLinePrice;
  /** Version resserrée, pour une petite carte. */
  readonly compact?: boolean;
}

/** « 4 h × 65,00 », ou ce qu'on en connaît. Rien si ni quantité ni prix unitaire. */
function lineDetail(line: PrintedLine): string | null {
  const quantity =
    line.quantity === null ? null : [formatQuantity(line.quantity), line.unit].filter(Boolean).join(" ");
  const unitPrice = line.unitPriceHT === null ? null : formatAmount(line.unitPriceHT);
  if (quantity && unitPrice) return `${quantity} × ${unitPrice}`;
  if (quantity) return quantity;
  if (unitPrice) return `PU ${unitPrice}`;
  return null;
}

/**
 * Une ligne du devis lu : désignation et montant HT, quantité × prix unitaire
 * dessous. Un constat surligne la ligne en jaune (de gauche à droite), pose
 * sa pastille, dont la couleur dit la nature du constat, et sa note ; une erreur de calcul sûre barre le montant imprimé et
 * écrit le bon à côté. Si une annotation s'insère au-dessus, la ligne glisse
 * à sa nouvelle place au lieu de sauter.
 */
export function QuoteLine({ line, revealed = true, delay = 0, issue, price, compact = false }: QuoteLineProps) {
  const { reduced } = useMotionPrefs();
  const transition: Transition = reduced
    ? { ...reducedFade(delay), layout: { duration: 0 } }
    : { ...transitions.lineReveal(delay), layout: transitions.reflow };
  const detail = lineDetail(line);
  const corrected = issue?.strike ? correctedLineTotal(line) : null;
  const appear = (start: number): Transition => (reduced ? reducedFade(start) : transitions.note(start));

  return (
    <motion.li
      layout="position"
      data-line={line.id}
      className={cn("relative", compact ? "px-5 py-3" : "px-5 py-3.5 sm:px-7")}
      initial={{ opacity: 0, y: offsets.lineRiseY }}
      animate={revealed ? { opacity: 1, y: 0 } : { opacity: 0, y: offsets.lineRiseY }}
      transition={transition}
    >
      {issue ? (
        <motion.span
          aria-hidden
          className="absolute inset-0 origin-left bg-highlighter-mark"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={issue.active ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0 }}
          transition={reduced ? reducedFade(issue.beats.highlight.start) : transitions.highlight(issue.beats.highlight.start)}
        />
      ) : null}

      <div className="relative grid grid-cols-[minmax(0,1fr)_auto] gap-x-4">
        <div className="min-w-0">
          <p className={cn("leading-snug text-ink", compact ? "text-[0.875rem]" : "text-[0.95rem]")}>{line.label}</p>
          {detail ? <p className="mt-0.5 font-mono text-xs tabular-nums text-ink-muted">{detail}</p> : null}
        </div>
        <p data-amount className={cn("flex items-baseline justify-end gap-2 font-mono tabular-nums", compact ? "text-[0.875rem]" : "text-[0.95rem]")}>
          {line.totalHT === null ? (
            <>
              <span aria-hidden>—</span>
              <span className="sr-only">montant non indiqué</span>
            </>
          ) : (
            <span className={cn("relative", corrected !== null && "text-ink-muted")}>
              {formatAmount(line.totalHT)}
              {corrected !== null && issue ? (
                <motion.span
                  aria-hidden
                  className="absolute inset-x-[-0.15em] top-1/2 h-[0.12em] origin-left -translate-y-1/2 bg-pen-red"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: issue.active ? 1 : 0 }}
                  transition={reduced ? reducedFade(issue.beats.circle.start) : transitions.highlight(issue.beats.circle.start)}
                />
              ) : null}
            </span>
          )}
          {corrected !== null && issue ? (
            <motion.span
              aria-hidden={issue.active ? undefined : true}
              className="font-semibold text-ink"
              initial={{ opacity: 0, x: offsets.noteShiftX }}
              animate={issue.active ? { opacity: 1, x: 0 } : { opacity: 0, x: offsets.noteShiftX }}
              transition={appear(issue.beats.note.start)}
            >
              <span className="sr-only">montant correct : </span>
              {formatAmount(corrected)}
            </motion.span>
          ) : null}
        </p>
      </div>

      {issue ? (
        <motion.p
          aria-hidden={issue.active ? undefined : true}
          className="relative mt-2 flex flex-wrap items-center gap-x-2 gap-y-1"
          initial={{ opacity: 0, x: offsets.noteShiftX }}
          animate={issue.active ? { opacity: 1, x: 0 } : { opacity: 0, x: offsets.noteShiftX }}
          transition={appear(issue.beats.circle.start)}
        >
          <Tag tone={issue.tone}>{issue.tag}</Tag>
          <span aria-hidden className="text-sm text-ink">
            {issue.note}
          </span>
          <span className="sr-only">{`${issue.tag} : ${issue.detail}`}</span>
        </motion.p>
      ) : null}

      {price ? (
        <PriceDelta
          amount={price.delta}
          source={price.source}
          active={price.active}
          delay={price.delay}
          size={compact ? "sm" : "md"}
          className="relative mt-2"
        />
      ) : null}
    </motion.li>
  );
}
