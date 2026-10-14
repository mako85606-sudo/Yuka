"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AmountMarks, gesture, MarginMarks, type PenTiming } from "@/components/landing/SheetMarks";
import { InkStamp } from "@/components/signature/InkStamp";
import { InkStroke } from "@/components/signature/InkStroke";
import { CameraGlyph } from "@/components/ui/icons";
import { storySchedule, type StoryBeats } from "@/lib/choreography";
import { cn } from "@/lib/cn";
import { demoSavingsText, type DemoQuote } from "@/lib/demo-outcome";
import { inkStroke, pencilBox } from "@/lib/hand-drawn";
import { heroFocusLine, heroMark, printedLine, printedTotals } from "@/lib/hero-sheet";
import { angles, cssGesture, easings, offsets, scales, story } from "@/lib/motion";
import { fr } from "@/lib/typography";

const STEPS = [
  {
    title: "Tu le prends en photo",
    text: "Page par page, posée à plat sur la table, ou directement le PDF reçu par mail. Pas besoin de scanner.",
  },
  {
    title: "Loupe le lit, ligne par ligne",
    text: "Chaque montant est recopié tel qu'il est imprimé, même quand le total est faux. C'est justement là qu'on va regarder.",
  },
  {
    title: "Le stylo rouge passe",
    text: "Ici, 1,5 heure à 70 € fait 105 €, pas 140. Loupe le voit, l'entoure, puis compare le prix des disques à ceux d'autres garages du coin.",
  },
  {
    title: "Ton message est prêt",
    text: "Un texte courtois, au vouvoiement, qui pose des questions plutôt que d'accuser. Tu le modifies si tu veux, puis tu l'envoies par mail ou par SMS.",
  },
] as const;

/**
 * Ligne de lecture : l'étape qui la franchit devient l'étape en cours. Au
 * centre de l'écran sur grand écran (le centre de la feuille collée à
 * droite), plus bas sur mobile, où la feuille occupe le haut de l'écran.
 */
const READING_LINE = { narrow: "-66% 0px -34% 0px", wide: "-50% 0px -50% 0px" } as const;

/** Colonnes de la feuille : marge gauche, désignation, montant, marge du correcteur, bord. */
const COLUMNS = "grid-cols-[1.1em_minmax(0,1fr)_5.6em_8.4em_0.6em]";

/** Repère d'un cadre au crayon autour d'une ligne (désignation et montant), en px pour 16 px. */
const PENCIL = { width: 274, height: 46 } as const;

/**
 * « Comment ça marche », raconté au défilement : quatre étapes de texte à
 * gauche, et à droite une seule feuille, collée au centre de l'écran, qui
 * change avec l'étape lue. Photo en perspective dans le viseur, lignes
 * encadrées au crayon, stylo rouge (le même que dans le hero), puis un
 * feuillet quadrillé où le message s'écrit. Chaque étape passe au centre de
 * la feuille au moment où elle devient l'étape en cours : pas de vide mort.
 * On défile à son rythme, dans les deux sens.
 */
export function HowItWorks({ quote }: { readonly quote: DemoQuote }) {
  const listRef = useRef<HTMLOListElement>(null);
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const items = [...list.querySelectorAll<HTMLElement>("[data-step]")];
    const wide = window.matchMedia("(min-width: 1024px)");
    let observer: IntersectionObserver | null = null;
    const observe = () => {
      observer?.disconnect();
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) setStep(Number((entry.target as HTMLElement).dataset.step));
          }
        },
        { rootMargin: wide.matches ? READING_LINE.wide : READING_LINE.narrow },
      );
      for (const item of items) observer.observe(item);
      setReady(true);
    };
    observe();
    wide.addEventListener("change", observe);
    return () => {
      observer?.disconnect();
      wide.removeEventListener("change", observe);
    };
  }, []);

  return (
    <div
      data-story-ready={ready ? "" : undefined}
      className="relative [--story-h:25rem] lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,29rem)] lg:gap-16 lg:[--story-h:34rem]"
    >
      <div className="sticky top-0 z-10 -mx-4 bg-paper px-4 pb-4 pt-3 sm:-mx-8 sm:px-8 lg:top-[calc(50vh-var(--story-h)/2)] lg:order-2 lg:mx-0 lg:self-start lg:bg-transparent lg:p-0">
        <StoryVisual quote={quote} step={step} />
      </div>
      {/* Chaque étape est un peu moins haute que la feuille : un retrait en haut et en bas garde la première et la dernière alignées sur son centre. */}
      <ol ref={listRef} className="lg:order-1 lg:py-[calc(var(--story-h)*0.14)]">
        {STEPS.map((item, index) => (
          <li
            key={item.title}
            data-step={index}
            data-current={index === step ? "" : undefined}
            className="story-step flex min-h-[60vh] flex-col justify-start pt-8 lg:min-h-[calc(var(--story-h)*0.72)] lg:justify-center lg:pt-0"
          >
            <span className="font-mono text-label uppercase text-ink-muted">{`Étape ${index + 1} sur ${STEPS.length}`}</span>
            <h3 className="mt-2 font-display text-[1.75rem] leading-tight text-ink sm:text-[2rem]">{item.title}</h3>
            <p className="mt-3 max-w-md text-[1.0625rem] leading-relaxed text-ink-muted">{fr(item.text)}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Pose de la feuille selon l'étape : photographiée, à plat, ou en retrait derrière le feuillet. */
function sheetPose(step: number): string {
  if (step <= 0) {
    return `perspective(60em) rotateX(${angles.storyPhotoTilt}deg) rotateZ(${angles.storyPhotoTurn}deg) scale(${scales.storyPhoto})`;
  }
  if (step >= 3) {
    return `perspective(60em) translateY(${offsets.storyRecedeY}px) rotateZ(${angles.sheetRest}deg) scale(${scales.storyRecede})`;
  }
  return `perspective(60em) rotateZ(${angles.sheetRest}deg)`;
}

/** Le visuel : une seule feuille, de la photo au message. Décoratif : le texte des étapes dit tout. */
function StoryVisual({ quote, step }: { readonly quote: DemoQuote; readonly step: number }) {
  const words = useMemo(() => (quote.message ? quote.message.split(" ") : []), [quote.message]);
  const beats = useMemo(() => storySchedule(quote.lines.length, words.length), [quote.lines.length, words.length]);
  const settle = cssGesture({ start: 0, duration: story.settle, ease: easings.out });
  const photo = step <= 0;

  return (
    <div aria-hidden className="relative mx-auto h-[var(--story-h)] max-w-[23rem] text-[12px] sm:text-[13px] lg:max-w-none lg:text-[14.5px]">
      {/* Le viseur de l'appareil photo et son étiquette, sur un bout de ruban adhésif. */}
      <div className={cn("settle absolute inset-x-[3%] bottom-[14%] top-[5%]", photo ? "opacity-100" : "opacity-0")} style={settle}>
        {(["left-0 top-0 border-l-2 border-t-2", "right-0 top-0 border-r-2 border-t-2", "bottom-0 left-0 border-b-2 border-l-2", "bottom-0 right-0 border-b-2 border-r-2"] as const).map(
          (corner) => (
            <span key={corner} className={cn("absolute size-[2.2em] border-ink", corner)} />
          ),
        )}
        <span
          className="absolute -top-[1.1em] left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-[0.5em] bg-tape/90 px-[1.2em] py-[0.35em] font-mono text-[0.85em] uppercase tracking-[0.14em] text-[color:var(--sheet-ink)] [clip-path:polygon(0_8%,3%_0,97%_6%,100%_0,98%_50%,100%_100%,96%_92%,4%_100%,0_94%,2%_50%)]"
          style={{ rotate: `${angles.storyTape}deg` }}
        >
          <CameraGlyph className="size-[1.2em]" />
          Photo du devis
        </span>
      </div>

      {/* La feuille. */}
      <div
        className="settle absolute left-1/2 top-1/2 w-[27em]"
        style={{ ...settle, transform: `translate(-50%, -50%) ${sheetPose(step)}` }}
      >
        <StorySheet quote={quote} step={step} beats={beats} />
      </div>

      {/* Le feuillet quadrillé, où le message s'écrit. */}
      {step >= 3 ? <MessageSlip quote={quote} words={words} beats={beats} /> : null}
    </div>
  );
}

function StorySheet({ quote, step, beats }: { readonly quote: DemoQuote; readonly step: number; readonly beats: StoryBeats }) {
  const focus = heroFocusLine(quote);
  const priced = quote.prices[0];
  const totals = printedTotals(quote);
  const penTiming: PenTiming = { wide: beats.pen, narrow: beats.pen };
  const priceTiming: PenTiming = { wide: beats.price, narrow: beats.price };
  const stampGesture = {
    ...gesture(beats.stamp, beats.stamp, easings.fall),
    "--tilt": `${angles.heroStamp}deg`,
    "--from": scales.heroStampFrom,
  } as CSSProperties;

  return (
    <div className="surface-paper sheet-shadow-rest relative overflow-hidden rounded-[2px] pb-[1.2em] text-ink [text-rendering:geometricPrecision]">
      <span className="absolute inset-y-0 right-[9em] w-px bg-margin-rule" />

      <div className={cn("grid pt-[1em]", COLUMNS)}>
        <div className="col-span-2 col-start-2 min-w-0 pr-[0.6em]">
          <p className="font-mono text-[0.62em] uppercase tracking-[0.16em] text-ink-muted">{`${quote.category} · ${quote.department}`}</p>
          <p className="mt-[0.5em] font-display text-[1.45em] leading-[1.08]">{quote.title}</p>
        </div>
        <div className="mx-[0.35em] flex h-[4.6em] flex-col border border-dashed border-rule-strong px-[0.25em] pt-[0.35em]">
          <p className="font-mono text-[0.48em] uppercase tracking-[0.12em] text-ink-muted">Visa du correcteur</p>
          <div className="grid flex-1 place-items-center">
            {step >= 2 && quote.verdict ? <InkStamp verdict={quote.verdict} gesture={stampGesture} className="-mx-[4%] w-[108%]" /> : null}
          </div>
        </div>
      </div>

      <div className={cn("mt-[0.8em] grid", COLUMNS)}>
        <p className="col-start-2 border-b border-rule-strong pb-[0.35em] font-mono text-[0.56em] uppercase tracking-[0.16em] text-ink-muted">
          Désignation
        </p>
        <p className="border-b border-rule-strong pb-[0.35em] pr-[0.9em] text-right font-mono text-[0.56em] uppercase tracking-[0.16em] text-ink-muted">
          Montant HT
        </p>
      </div>

      {quote.lines.map((line, index) => {
        const printed = printedLine(line);
        const pencil = beats.pencils[index];
        const timing = line.id === focus?.id ? penTiming : line.id === priced?.lineId ? priceTiming : null;
        const mark = timing ? heroMark(quote, line) : null;
        return (
          <div key={line.id} className={cn("relative grid h-[3.3em]", COLUMNS)}>
            {step >= 1 && pencil ? <PencilBox id={`histoire-${line.id}`} start={pencil.start} duration={pencil.duration} /> : null}
            <div className="col-start-2 min-w-0 border-b border-rule pt-[0.6em]">
              <p className="truncate text-[0.9em] leading-[1.2]">{printed.label}</p>
              <p className="mt-[0.2em] font-mono text-[0.66em] tabular-nums text-ink-muted">{printed.detail}</p>
            </div>
            <div className="relative border-b border-rule pr-[0.9em] pt-[0.6em] text-right">
              <p className="font-mono text-[0.9em] leading-[1.2] tabular-nums">{printed.amount}</p>
              {step >= 2 && mark && timing ? <AmountMarks id={`histoire-${line.id}`} mark={mark} timing={timing} /> : null}
            </div>
            <div className="relative text-[0.92em]">
              {step >= 2 && mark && timing ? <MarginMarks id={`histoire-${line.id}`} mark={mark} timing={timing} /> : null}
            </div>
          </div>
        );
      })}

      <div className="mt-[0.4em]">
        {totals.map((total) => (
          <div key={total.label} className={cn("grid h-[1.6em] items-center", COLUMNS)}>
            <p className={cn("col-start-2 text-right font-mono text-[0.7em] text-ink-muted", total.strong && "font-semibold text-ink")}>
              {total.label}
            </p>
            <p className={cn("pr-[0.9em] text-right font-mono text-[0.82em] tabular-nums", total.strong && "font-semibold")}>
              {total.amount}
            </p>
          </div>
        ))}
      </div>

      {/* La lecture de la photo : une ligne de scan qui balaie la feuille, en boucle. */}
      {step <= 0 ? (
        <span className="gesture gesture-scan pointer-events-none absolute inset-0" style={cssGesture({ start: 0, duration: story.scan, ease: easings.inOut })}>
          <span className="absolute inset-x-0 bottom-0 h-[2.4em] border-b-2 border-annotation-blue/70 bg-annotation-blue/[0.07]" />
        </span>
      ) : null}
      <span className="paper-grain pointer-events-none absolute inset-0" />
    </div>
  );
}

/** Cadre au crayon autour d'une ligne : graphite, tracé d'un geste. */
function PencilBox({ id, start, duration }: { readonly id: string; readonly start: number; readonly duration: number }) {
  const stroke = useMemo(() => inkStroke(id, pencilBox(id, PENCIL.width, PENCIL.height), { min: 0.5, max: 1.2 }), [id]);
  const draw = cssGesture({ start, duration, ease: easings.write });
  return (
    <InkStroke
      stroke={stroke}
      {...PENCIL}
      gesture={draw}
      className="absolute left-[0.85em] top-[0.15em] text-ink-muted opacity-80"
    />
  );
}

/** Le feuillet quadrillé : il glisse sur le bureau, puis le message s'écrit, mot après mot. */
function MessageSlip({ quote, words, beats }: { readonly quote: DemoQuote; readonly words: readonly string[]; readonly beats: StoryBeats }) {
  const savings = demoSavingsText(quote);
  const slide = {
    ...cssGesture({ start: beats.slip.start, duration: beats.slip.duration, ease: easings.out }),
    "--from-y": `${offsets.storySlipFromY}px`,
    "--tilt": `${angles.storySlip}deg`,
  } as CSSProperties;
  return (
    <div
      className="gesture gesture-slide surface-paper graph-paper sheet-shadow-lifted absolute bottom-[3%] right-0 w-[20em] rounded-[2px] px-[1.1em] pb-[0.9em] pt-[1.3em] lg:-right-[1em] lg:w-[21em]"
      style={slide}
    >
      <span className="absolute -top-[0.7em] left-[38%] h-[1.4em] w-[5em] bg-tape/85 [clip-path:polygon(0_10%,4%_0,96%_8%,100%_0,97%_50%,100%_100%,95%_92%,5%_100%,0_90%,3%_50%)]" style={{ rotate: `${angles.storyTape}deg` }} />
      <p className="font-hand text-[1.02em] leading-[1.45] text-annotation-blue">
        {words.map((word, index) => (
          <span key={index} className="gesture gesture-fade" style={cssGesture({ start: beats.words[index]?.start ?? 0, duration: beats.words[index]?.duration ?? 0 })}>
            {index < words.length - 1 ? `${word} ` : word}
          </span>
        ))}
      </p>
      <div className="mt-[0.7em] flex items-baseline justify-between gap-[1em] border-t border-rule pt-[0.5em] font-mono text-[0.62em] uppercase tracking-[0.12em] text-ink-muted">
        <span className="text-ink underline decoration-annotation-blue decoration-2 underline-offset-[0.3em]">Copier</span>
        {savings ? <span>{fr(`Économie : ${savings}`)}</span> : null}
      </div>
    </div>
  );
}
