"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { HandText } from "@/components/signature/HandText";
import { InkStamp } from "@/components/signature/InkStamp";
import { InkStroke } from "@/components/signature/InkStroke";
import { heroSchedule, penBeats, type PenBeats, type Segment } from "@/lib/choreography";
import { cn } from "@/lib/cn";
import type { DemoQuote } from "@/lib/demo-outcome";
import { formatShortDate } from "@/lib/format";
import {
  connectorPath,
  HIGHLIGHTER_VIEWBOX,
  highlighterShape,
  inkStroke,
  penLoop,
  penTick,
  penUnderline,
} from "@/lib/hand-drawn";
import { heroFocusLine, heroMark, heroRows, printedLine, printedTotals, type HeroMark } from "@/lib/hero-sheet";
import { angles, cssGesture, easings, hero, scales, type CubicBezier } from "@/lib/motion";
import { describeCorrection, type SceneLine } from "@/lib/scene-quote";

/**
 * Repères des traits, en px pour un texte de 16 px (ils suivent la taille du
 * texte de la feuille) : la boucle autour d'un montant, le soulignement, la
 * coche, le trait de la note de marge.
 */
const LOOP = { width: 80, height: 34 } as const;
const UNDERLINE = { width: 66, height: 12 } as const;
const TICK = { width: 17, height: 15 } as const;
const LINK = { width: 22, height: 18, from: { x: 20, y: 13 }, to: { x: 2, y: 7 } } as const;
const PEN_WIDTH = { min: 0.9, max: 2.6 } as const;

/** Colonnes de la feuille : marge gauche, désignation, montant, marge du correcteur, papier qui déborde. */
const COLUMNS = "grid-cols-[1.4em_minmax(0,1fr)_6em_var(--margin)_var(--bleed)]";

/** Les gestes d'une ligne, sur grand et sur petit écran. */
interface PenTiming {
  readonly wide: PenBeats;
  readonly narrow: PenBeats;
}

function gesture(wide: Segment, narrow: Segment, ease: CubicBezier = easings.out): CSSProperties {
  return cssGesture({ start: wide.start, duration: wide.duration, ease, narrowStart: narrow.start });
}

/**
 * La feuille du hero : un devis fictif posé de travers sur le bureau, qui
 * déborde du bord droit et glisse sous la section suivante. Une seule
 * séquence, jouée en CSS (elle tourne sans JavaScript, et s'affiche corrigée
 * d'emblée en mouvement réduit) : les lignes se tapent, le stylo entoure le
 * montant faux, la correction et la note s'écrivent, le tampon tombe dans le
 * cadre « Visa du correcteur ». Sur petit écran, les lignes sont déjà
 * imprimées et la correction attend que la ligne fautive soit à l'écran.
 *
 * Choisir une autre ligne y fait passer le stylo : ce qu'il écrit vient des
 * constats du devis (`heroMark`). Rien ne bouge dans la mise en page : chaque
 * ligne a sa hauteur fixe, chaque annotation sa place réservée dans la marge.
 */
export function HeroSheet({ quote }: { readonly quote: DemoQuote }) {
  const focus = heroFocusLine(quote);
  const schedule = useMemo(() => heroSchedule(heroRows(quote)), [quote]);
  const totals = printedTotals(quote);
  const [hold, setHold] = useState(true);
  const [picks, setPicks] = useState<Readonly<Record<string, number>>>({});
  const focusRef = useRef<HTMLDivElement>(null);

  // Petit écran : la correction part quand la ligne fautive est à l'écran (au-dessus du bouton
  // collant). La ligne déborde à droite avec la feuille : elle n'est jamais visible en entier.
  useEffect(() => {
    const row = focusRef.current;
    if (!row) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setHold(false);
          observer.disconnect();
        }
      },
      { threshold: 0.6, rootMargin: "0px 0px -96px 0px" },
    );
    observer.observe(row);
    return () => observer.disconnect();
  }, []);

  const pick = (event: MouseEvent<HTMLDivElement>) => {
    const id = (event.target as HTMLElement).closest<HTMLElement>("[data-line]")?.dataset.line;
    if (!id) return;
    setHold(false);
    setPicks((previous) => ({ ...previous, [id]: (previous[id] ?? 0) + 1 }));
  };

  const picked = penBeats(hero.pickStart);
  const timingFor = (line: SceneLine): PenTiming | null => {
    if (picks[line.id]) return { wide: picked, narrow: picked };
    if (line.id === focus?.id) return { wide: schedule.pen, narrow: schedule.narrowPen };
    return null;
  };

  const stampGesture = {
    ...gesture(schedule.stamp, schedule.narrowStamp, easings.fall),
    "--tilt": `${angles.heroStamp}deg`,
    "--from": scales.heroStampFrom,
  } as CSSProperties;

  return (
    <>
      <p className="sr-only">{`Exemple fictif. ${describeCorrection(quote)}`}</p>
      <div
        aria-hidden
        data-hold={hold ? "" : undefined}
        className={cn(
          "surface-paper sheet-shadow-rest relative [text-rendering:geometricPrecision] -mr-[calc(var(--bleed)*0.4)] select-none lg:-mr-[calc(var(--bleed)*0.8)] rounded-[2px] pb-[2.2em] text-ink",
          "[--bleed:1.2em] [--margin:7em] sm:[--bleed:2.4em] sm:[--margin:9.5em]",
        )}
        style={{ rotate: `${angles.heroSheet}deg` }}
      >
        {/* La marge du correcteur, tracée au crayon rouge sur toute la hauteur. */}
        <span className="absolute inset-y-0 right-[calc(var(--bleed)+var(--margin))] w-px bg-margin-rule" />

        <header className={cn("grid pt-[1.3em]", COLUMNS)}>
          <div className="col-span-2 col-start-2 min-w-0 pr-[1em]">
            <p className="font-mono text-[0.62em] uppercase tracking-[0.16em] text-ink-muted">Devis · exemple fictif</p>
            <p className="mt-[0.6em] text-[0.82em] leading-snug">{`${quote.category} · ${quote.department}`}</p>
            <p className="text-[0.82em] leading-snug text-ink-muted">
              {`Daté du ${formatShortDate(quote.issuedAt)} · valable ${quote.validityDays} jours`}
            </p>
            <p className="mt-[0.7em] font-display text-[1.55em] leading-[1.08]">{quote.title}</p>
          </div>
          <div className="mx-[0.45em] flex h-[6.6em] flex-col border border-dashed border-rule-strong px-[0.3em] pt-[0.45em]">
            <p className="font-mono text-[0.52em] uppercase tracking-[0.14em] text-ink-muted">Visa du correcteur</p>
            <div className="grid flex-1 place-items-center">
              <InkStamp verdict={quote.verdict} gesture={stampGesture} className="-mx-[4%] w-[108%]" />
            </div>
          </div>
        </header>

        <div className={cn("relative mt-[1.2em] grid", COLUMNS)}>
          {/* Le pli de la feuille, entre l'en-tête et le tableau. */}
          <span className="pointer-events-none absolute inset-x-0 -top-[0.6em] h-[2px] bg-ink/[0.07]" />
          <span className="pointer-events-none absolute inset-x-0 -top-[0.6em] h-px bg-ink/10" />
          <p className="col-start-2 border-b border-rule-strong pb-[0.4em] font-mono text-[0.58em] uppercase tracking-[0.16em] text-ink-muted">
            Désignation
          </p>
          <p className="border-b border-rule-strong pb-[0.4em] pr-[1.2em] text-right font-mono text-[0.58em] uppercase tracking-[0.16em] text-ink-muted">
            Montant HT
          </p>
        </div>

        <div onClick={pick}>
          {quote.lines.map((line, index) => {
            const timing = timingFor(line);
            const row = schedule.rows[index];
            return (
              <div key={line.id} ref={line.id === focus?.id ? focusRef : undefined}>
                <SheetRow
                  line={line}
                  typing={row}
                  mark={timing ? heroMark(quote, line) : null}
                  timing={timing}
                  replay={picks[line.id] ?? 0}
                />
              </div>
            );
          })}
        </div>

        <div className="mt-[0.6em]">
          {totals.map((total, index) => {
            const row = schedule.rows[quote.lines.length + index];
            return (
              <div key={total.label} className={cn("grid h-[1.85em] items-center", COLUMNS)}>
                <p className={cn("col-start-2 text-right font-mono text-[0.72em] text-ink-muted", total.strong && "font-semibold text-ink")}>
                  <HandText typed gesture={row ? typedGesture(row.label, total.label.length) : undefined}>
                    {total.label}
                  </HandText>
                </p>
                <p className={cn("pr-[0.9em] text-right font-mono text-[0.85em] tabular-nums", total.strong && "font-semibold")}>
                  <HandText typed gesture={row ? typedGesture(row.amount, total.amount.length) : undefined}>
                    {total.amount}
                  </HandText>
                </p>
              </div>
            );
          })}
        </div>

        {/* Le grain du papier, par-dessus l'encre. */}
        <span className="paper-grain pointer-events-none absolute inset-0 rounded-[2px]" />
      </div>
    </>
  );
}

function typedGesture(segment: Segment, characters: number): CSSProperties {
  return cssGesture({ start: segment.start, duration: segment.duration, ease: easings.linear, steps: characters });
}

interface SheetRowProps {
  readonly line: SceneLine;
  readonly typing: { readonly label: Segment; readonly detail: Segment; readonly amount: Segment } | undefined;
  readonly mark: HeroMark | null;
  readonly timing: PenTiming | null;
  /** Nombre de passages du stylo choisis sur cette ligne : chaque nouveau passage rejoue le geste. */
  readonly replay: number;
}

/** Une ligne du devis, à hauteur fixe ; ses annotations ont leur place réservée. */
function SheetRow({ line, typing, mark, timing, replay }: SheetRowProps) {
  const printed = printedLine(line);
  const marks = mark && timing ? { mark, timing } : null;
  return (
    <div data-line={line.id} className={cn("group grid h-[3.9em] cursor-pointer sm:h-[3.6em]", COLUMNS)}>
      <div className="relative col-start-2 min-w-0 border-b border-rule pr-[0.6em] pt-[0.7em]">
        <p className="line-clamp-2 text-[0.9em] leading-[1.2] decoration-rule-strong decoration-dotted underline-offset-4 group-hover:underline">
          <span className="relative">
            {marks?.mark.kind === "vague" ? <Highlight key={replay} id={line.id} timing={marks.timing} /> : null}
            <HandText typed gesture={typing ? typedGesture(typing.label, printed.label.length) : undefined}>
              {printed.label}
            </HandText>
          </span>
        </p>
        <p className="mt-[0.25em] font-mono text-[0.66em] tabular-nums text-ink-muted">
          <HandText typed gesture={typing ? typedGesture(typing.detail, printed.detail.length) : undefined}>
            {printed.detail}
          </HandText>
        </p>
      </div>
      <div className="relative border-b border-rule pr-[0.9em] pt-[0.7em] text-right">
        <p data-amount className="font-mono text-[0.9em] leading-[1.2] tabular-nums">
          <HandText typed gesture={typing ? typedGesture(typing.amount, printed.amount.length) : undefined}>
            {printed.amount}
          </HandText>
        </p>
        {marks ? <AmountMarks key={replay} id={line.id} mark={marks.mark} timing={marks.timing} /> : null}
      </div>
      <div className="relative">
        {marks ? <MarginMarks key={replay} id={line.id} mark={marks.mark} timing={marks.timing} /> : null}
      </div>
    </div>
  );
}

/** Ce que le stylo fait autour du montant : cercle et chiffre corrigé, soulignement, ou coche. */
function AmountMarks({ id, mark, timing }: { readonly id: string; readonly mark: HeroMark; readonly timing: PenTiming }) {
  const stroke = useMemo(() => {
    if (mark.kind === "calculation") return inkStroke(id, penLoop(id, LOOP.width, LOOP.height).points, PEN_WIDTH);
    if (mark.kind === "price") return inkStroke(id, penUnderline(id, UNDERLINE.width, UNDERLINE.height), PEN_WIDTH);
    if (mark.kind === "ok") return inkStroke(id, penTick(id, TICK.width, TICK.height), PEN_WIDTH);
    return null;
  }, [id, mark.kind]);
  const draw = gesture(timing.wide.circle, timing.narrow.circle);

  if (mark.kind === "calculation" && stroke) {
    return (
      <>
        <InkStroke stroke={stroke} {...LOOP} gesture={draw} className="absolute right-[0.25em] top-[0.2em] text-pen-red" />
        <span className="absolute right-[5.4em] top-[0.35em]" style={{ rotate: `${angles.handNote}deg` }}>
          <span className="block font-hand text-[1.45em] leading-none text-pen-red">
            <HandText gesture={gesture(timing.wide.correction, timing.narrow.correction, easings.write)}>{mark.correct}</HandText>
          </span>
        </span>
      </>
    );
  }
  if (mark.kind === "price" && stroke) {
    return <InkStroke stroke={stroke} {...UNDERLINE} gesture={draw} className="absolute right-[0.7em] top-[1.75em] text-annotation-blue" />;
  }
  if (mark.kind === "ok" && stroke) {
    return <InkStroke stroke={stroke} {...TICK} gesture={draw} className="absolute right-[4.6em] top-[0.6em] text-pen-red" />;
  }
  return null;
}

/** Ce que le stylo écrit dans la marge, relié à sa ligne par un trait. */
function MarginMarks({ id, mark, timing }: { readonly id: string; readonly mark: HeroMark; readonly timing: PenTiming }) {
  const link = useMemo(() => connectorPath(id, LINK.from, LINK.to, -1), [id]);
  const write = gesture(timing.wide.note, timing.narrow.note, easings.write);
  const arrowAt = (beats: PenBeats) => ({ start: beats.note.start + beats.note.duration * 0.3, duration: beats.note.duration * 0.2 });
  return (
    <div className="absolute inset-x-[0.55em] top-[0.45em] text-annotation-blue">
      <svg
        viewBox={`0 0 ${LINK.width} ${LINK.height}`}
        className="absolute -left-[1.5em] top-[0.15em] overflow-visible"
        style={{ width: `${LINK.width / 16}em`, height: `${LINK.height / 16}em` }}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.3}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={link.d} pathLength={1} className="gesture gesture-draw" style={write} />
        <path d={link.arrow} className="gesture gesture-fade" style={gesture(arrowAt(timing.wide), arrowAt(timing.narrow))} />
      </svg>
      <p className="font-hand text-[1em] leading-[1.15]">
        <HandText gesture={write}>{mark.note}</HandText>
      </p>
      {mark.kind === "price" ? (
        <p className="mt-[0.2em] font-mono text-[0.5em] uppercase leading-snug tracking-[0.1em] text-ink-muted">
          <HandText gesture={write}>{mark.caption}</HandText>
        </p>
      ) : null}
    </div>
  );
}

/** Coup de surligneur sur le libellé d'une ligne vague, mélangé au papier. */
function Highlight({ id, timing }: { readonly id: string; readonly timing: PenTiming }) {
  const shape = useMemo(() => highlighterShape(id), [id]);
  return (
    <span className="gesture gesture-sweep pointer-events-none absolute -inset-x-[0.35em] -inset-y-[0.12em] z-10 mix-blend-multiply" style={gesture(timing.wide.circle, timing.narrow.circle)}>
      <svg className="block h-full w-full" viewBox={`0 0 ${HIGHLIGHTER_VIEWBOX.width} ${HIGHLIGHTER_VIEWBOX.height}`} preserveAspectRatio="none">
        <path d={shape} className="fill-highlighter-mark" />
      </svg>
    </span>
  );
}
