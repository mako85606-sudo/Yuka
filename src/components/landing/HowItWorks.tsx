"use client";

import { motion, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useMotionPrefs } from "@/components/motion/MotionPreferences";
import { HighlighterMark } from "@/components/signature/HighlighterMark";
import { MarginNote } from "@/components/signature/MarginNote";
import { PaperSheet } from "@/components/signature/PaperSheet";
import { PriceDelta } from "@/components/signature/PriceDelta";
import { RedCircle } from "@/components/signature/RedCircle";
import { Stamp } from "@/components/signature/Stamp";
import { CameraGlyph } from "@/components/ui/icons";
import { issueBeats, verdictBeats } from "@/lib/choreography";
import { cn } from "@/lib/cn";
import { demoSavingsText, type DemoQuote } from "@/lib/demo-outcome";
import { formatAmount, formatQuantity } from "@/lib/format";
import {
  angles,
  durations,
  LAZY_MOUNT_MARGIN,
  offsets,
  reducedFade,
  scales,
  springs,
  stagger,
  transitions,
} from "@/lib/motion";
import { fr } from "@/lib/typography";

const STEPS = [
  {
    title: "Tu le prends en photo",
    text: "Une photo par page, ou le PDF. Pas besoin de scanner : ton téléphone suffit.",
  },
  {
    title: "Loupe le lit, ligne par ligne",
    text: "Les montants sont recopiés tels qu'imprimés, même faux : c'est justement ce qu'on vérifie.",
  },
  {
    title: "Le stylo rouge passe",
    text: "Calculs refaits, mentions vérifiées, chaque prix comparé à des devis de ta région.",
  },
  {
    title: "Ton message est prêt",
    text: "Poli, factuel, prêt à copier. Tu négocies sans te fâcher, et sans y passer la soirée.",
  },
] as const;

/**
 * Ligne de lecture : une étape devient l'étape en cours quand son haut la
 * franchit. Plus bas sur mobile, où le visuel occupe le haut de l'écran.
 */
const READING_LINE = { mobile: 0.66, desktop: 0.55 } as const;

/** Place du visuel, réservée avant qu'il soit monté. */
const VISUAL_BOX = "relative mx-auto h-[23.5rem] max-w-[22rem] sm:h-[24rem] lg:h-[32rem] lg:max-w-none";

/**
 * « Comment ça marche », raconté au défilement : quatre étapes de texte
 * défilent normalement, et le visuel (collé en haut sur mobile, à droite sur
 * grand écran) montre l'étape en cours. Rien n'est détourné : on défile à
 * son rythme, vite ou lentement, dans les deux sens.
 */
export function HowItWorks({ quote }: { readonly quote: DemoQuote }) {
  const listRef = useRef<HTMLOListElement>(null);
  const near = useInView(listRef, { once: true, margin: LAZY_MOUNT_MARGIN });
  const [step, setStep] = useState(-1);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const items = [...list.querySelectorAll<HTMLElement>("[data-step]")];
    const desktop = window.matchMedia("(min-width: 1024px)");
    let frame = 0;
    const measure = () => {
      frame = 0;
      const line = window.innerHeight * (desktop.matches ? READING_LINE.desktop : READING_LINE.mobile);
      let current = -1;
      items.forEach((item, index) => {
        if (item.getBoundingClientRect().top <= line) current = index;
      });
      setStep(current);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="relative lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-16">
      <div className="sticky top-0 z-10 -mx-4 bg-paper px-4 pb-6 pt-4 sm:-mx-8 sm:px-8 lg:top-20 lg:order-2 lg:mx-0 lg:self-start lg:bg-transparent lg:px-0 lg:pt-0">
        {near ? <StoryVisual quote={quote} step={step} /> : <div aria-hidden className={VISUAL_BOX} />}
      </div>
      <ol ref={listRef} className="lg:order-1">
        {STEPS.map((item, index) => (
          <StepText key={item.title} index={index} current={index === step} {...item} />
        ))}
      </ol>
    </div>
  );
}

function StepText({
  index,
  title,
  text,
  current,
}: {
  readonly index: number;
  readonly title: string;
  readonly text: string;
  readonly current: boolean;
}) {
  const { reduced } = useMotionPrefs();
  return (
    <motion.li
      data-step={index}
      className="flex min-h-[55vh] flex-col justify-start pt-6 lg:min-h-[70vh] lg:justify-center lg:pt-0"
      initial={false}
      animate={{ opacity: current ? 1 : 0.38 }}
      transition={reduced ? reducedFade() : transitions.storyStep}
    >
      <span className="font-mono text-label uppercase text-pen-red-strong">{`Étape ${index + 1} sur ${STEPS.length}`}</span>
      <h3 className="mt-2 font-display text-[2rem] leading-tight text-ink sm:text-[2.4rem]">{title}</h3>
      <p className="mt-3 max-w-md text-[1.0625rem] leading-relaxed text-ink-muted">{fr(text)}</p>
    </motion.li>
  );
}

/** Le visuel : un devis court, de la photo au message, selon l'étape atteinte. */
function StoryVisual({ quote, step }: { readonly quote: DemoQuote; readonly step: number }) {
  const { reduced } = useMotionPrefs();
  const photo = step <= 0;
  const read = step >= 1;
  const checked = step >= 2;
  const messaged = step >= 3;
  const issue = quote.issues[0];
  const beats = issueBeats({ startAt: durations.micro, reduced });
  const verdict = verdictBeats({ startAt: beats.note.start + durations.note + durations.micro, reduced });
  const savings = demoSavingsText(quote);
  const fade = (on: boolean, delay = 0) => ({
    initial: { opacity: 0 },
    animate: { opacity: on ? 1 : 0 },
    transition: reduced ? reducedFade(delay) : transitions.fadeIn(delay),
  });

  return (
    <div aria-hidden className={VISUAL_BOX}>
      {/* Le cadre de l'appareil photo, puis le devis redressé. */}
      <motion.div
        className="relative mx-auto max-w-[20rem] lg:mt-10 lg:max-w-[22rem]"
        initial={false}
        style={{ transformOrigin: "50% 0%" }}
        animate={
          photo
            ? { rotate: angles.storyPhoto, scale: scales.storyPhoto, y: offsets.storyShiftY }
            : messaged
              ? { rotate: 0, scale: scales.storyMessage, y: 0 }
              : { rotate: 0, scale: 1, y: 0 }
        }
        transition={reduced ? reducedFade() : springs.gentle}
      >
        <PaperSheet entrance={false} scanning={step === 1}>
          <div className="px-4 pb-4 pt-3.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-label uppercase text-ink-muted">{quote.category}</p>
                <p className="mt-1 font-display text-[1.3rem] leading-tight text-ink">{quote.title}</p>
              </div>
              <Stamp verdict={quote.verdict} id={`histoire-${quote.id}`} active={checked} delay={verdict.stamp.start} size="sm" />
            </div>
            <ul className="mt-3 divide-y divide-rule">
              {quote.lines.map((line, index) => {
                const flagged = issue?.lineId === line.id;
                const price = quote.prices.find((item) => item.lineId === line.id);
                return (
                  <li key={line.id} className="relative py-2">
                    {/* Sur la photo, des lignes encore illisibles. */}
                    <motion.div className="absolute inset-x-0 top-3 space-y-2" {...fade(!read)}>
                      <span className="flex justify-between gap-6">
                        <span className="h-2.5 w-2/3 rounded-full bg-rule" />
                        <span className="h-2.5 w-12 rounded-full bg-rule" />
                      </span>
                      <span className="block h-2 w-1/3 rounded-full bg-rule" />
                    </motion.div>
                    <motion.div {...fade(read, read ? index * stagger.prices : 0)}>
                      <div className="relative">
                        {flagged && issue ? (
                          <RedCircle id={`histoire-${issue.id}`} active={checked} delay={beats.circle.start} className="-inset-x-2 -inset-y-2.5" />
                        ) : null}
                        <div className="relative isolate flex items-baseline gap-3 text-[0.85rem]">
                          {flagged && issue ? (
                            <HighlighterMark id={`histoire-${issue.id}`} active={checked} delay={beats.highlight.start} />
                          ) : null}
                          <span className="min-w-0 flex-1 leading-snug">{line.label}</span>
                          <span className="shrink-0 font-mono tabular-nums">{formatAmount(line.totalHT)}</span>
                        </div>
                        <p className="mt-0.5 font-mono text-xs tabular-nums text-ink-muted">
                          {`${formatQuantity(line.quantity)} ${line.unit} × ${formatAmount(line.unitPriceHT)}`}
                        </p>
                      </div>
                      {flagged && issue ? (
                        <MarginNote id={`histoire-${issue.id}`} active={checked} delay={beats.note.start} placement="below" className="mt-2">
                          {issue.note}
                        </MarginNote>
                      ) : null}
                      {price ? (
                        <PriceDelta amount={price.delta} source={price.source} active={checked} delay={beats.note.start} size="sm" className="mt-2" />
                      ) : null}
                    </motion.div>
                  </li>
                );
              })}
            </ul>
          </div>
        </PaperSheet>

        {/* Les coins du viseur et l'éclair. */}
        <motion.div className="pointer-events-none absolute -inset-3" {...fade(photo)}>
          {(["left-0 top-0 border-l-2 border-t-2", "right-0 top-0 border-r-2 border-t-2", "bottom-0 left-0 border-b-2 border-l-2", "bottom-0 right-0 border-b-2 border-r-2"] as const).map(
            (corner) => (
              <span key={corner} className={cn("absolute size-7 rounded-[3px] border-ink", corner)} />
            ),
          )}
          <span className="absolute -top-9 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-ink px-3 py-1 font-mono text-label uppercase text-paper-raised">
            <CameraGlyph className="size-3.5" />
            Photo du devis
          </span>
        </motion.div>
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-[3px] bg-paper-raised"
          initial={{ opacity: 0 }}
          animate={step === 0 && !reduced ? { opacity: [0, 0.9, 0] } : { opacity: 0 }}
          transition={transitions.flash()}
        />
      </motion.div>

      {/* Le message, posé sur le bas du devis. */}
      <motion.div
        className="absolute inset-x-2 bottom-0 lg:-bottom-4 lg:inset-x-0"
        initial={{ opacity: 0, y: offsets.storyShiftY }}
        animate={messaged ? { opacity: 1, y: 0 } : { opacity: 0, y: offsets.storyShiftY }}
        transition={reduced ? reducedFade() : transitions.storyStep}
      >
        <div className="ml-auto max-w-[19rem] rounded-[14px] rounded-br-[4px] bg-annotation-blue px-4 py-3 text-[0.875rem] leading-snug text-paper-raised">
          <p>{quote.message}</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="inline-flex rounded-full bg-paper-raised/15 px-2.5 py-0.5 text-[0.75rem] font-medium">Copier</span>
            {savings ? (
              <span className="font-mono text-[0.75rem] font-semibold tabular-nums">{fr(`Économie : ${savings}`)}</span>
            ) : null}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
