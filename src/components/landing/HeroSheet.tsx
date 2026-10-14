"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { AmountMarks, gesture, Highlight, MarginMarks, type PenTiming } from "@/components/landing/SheetMarks";
import { HandText } from "@/components/signature/HandText";
import { InkStamp } from "@/components/signature/InkStamp";
import { heroSchedule, penBeats, type Segment } from "@/lib/choreography";
import { cn } from "@/lib/cn";
import type { DemoQuote } from "@/lib/demo-outcome";
import { formatShortDate } from "@/lib/format";
import { heroFocusLine, heroMark, heroRows, printedLine, printedTotals, type HeroMark } from "@/lib/hero-sheet";
import { angles, cssGesture, easings, hero, scales } from "@/lib/motion";
import { describeCorrection, type SceneLine } from "@/lib/scene-quote";

/** Colonnes de la feuille : marge gauche, désignation, montant, marge du correcteur, papier qui déborde. */
const COLUMNS = "grid-cols-[1.4em_minmax(0,1fr)_6em_var(--margin)_var(--bleed)]";

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
