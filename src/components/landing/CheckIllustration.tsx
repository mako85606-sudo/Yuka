"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";
import { useMotionPrefs } from "@/components/motion/MotionPreferences";
import { HighlighterMark } from "@/components/signature/HighlighterMark";
import { PaperSheet } from "@/components/signature/PaperSheet";
import { PriceDelta } from "@/components/signature/PriceDelta";
import { RedCircle } from "@/components/signature/RedCircle";
import { endOf, issueBeats } from "@/lib/choreography";
import { durations, offsets, reducedFade, stagger, transitions } from "@/lib/motion";

type Kind = "calculation" | "mentions" | "prices";

/** Le geste commence un peu après l'entrée dans l'écran. */
const START = 0.15;

/**
 * Petites fiches illustrant chaque vérification, chacune avec sa preuve : le
 * calcul faux barré puis corrigé, les mentions cochées une à une puis celle
 * qui manque entourée, le prix placé sur une jauge à côté de la médiane.
 * Elles se corrigent quand elles arrivent à l'écran, une seule fois.
 * Décoratives : le texte à côté dit la même chose.
 */
export function CheckIllustration({ kind }: { readonly kind: Kind }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });

  return (
    <div ref={ref} aria-hidden className="mx-auto w-full max-w-[19rem]">
      <PaperSheet entrance={false}>
        <div className="px-5 pb-5 pt-4">
          {kind === "calculation" ? <Calculation active={inView} /> : null}
          {kind === "mentions" ? <Mentions active={inView} /> : null}
          {kind === "prices" ? <Prices active={inView} /> : null}
        </div>
      </PaperSheet>
    </div>
  );
}

function Calculation({ active }: { readonly active: boolean }) {
  const { reduced } = useMotionPrefs();
  const beats = issueBeats({ startAt: START, reduced });
  const strikeAt = reduced ? beats.circle.start : endOf(beats.circle);
  const fixAt = reduced ? strikeAt : strikeAt + durations.highlight;
  return (
    <>
      <p className="font-mono text-label uppercase text-ink-muted">Main-d&apos;œuvre</p>
      <div className="relative isolate mt-9 flex items-baseline justify-between font-mono text-[0.95rem] tabular-nums">
        <HighlighterMark id="vitrine-calcul" active={active} delay={beats.highlight.start} />
        <span>4 h × 65,00</span>
        <span className="relative px-1">
          {/* La correction du prof, au-dessus du montant barré. */}
          <motion.span
            className="absolute -top-8 right-0 font-hand text-[1.5rem] leading-none text-pen-red-strong"
            initial={{ opacity: 0, y: offsets.lineRiseY }}
            animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: offsets.lineRiseY }}
            transition={reduced ? reducedFade(fixAt) : transitions.note(fixAt)}
          >
            260,00
          </motion.span>
          280,00
          <motion.span
            className="absolute inset-x-0 top-1/2 h-[2px] origin-left rounded-full bg-pen-red"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={active ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0 }}
            transition={reduced ? reducedFade(strikeAt) : transitions.highlight(strikeAt)}
          />
          <RedCircle
            id="vitrine-calcul"
            active={active}
            delay={beats.circle.start}
            className="-inset-x-2.5 -inset-y-2.5 sm:-inset-x-2.5"
          />
        </span>
      </div>
      <p className="mt-4 text-right font-mono text-label uppercase text-ink-muted">4 × 65 = 260</p>
    </>
  );
}

const MENTIONS = ["Durée de validité", "Décompte détaillé", "Frais de déplacement"] as const;

function Mentions({ active }: { readonly active: boolean }) {
  const { reduced } = useMotionPrefs();
  // Les coches se tracent une à une, puis la mention absente est surlignée et entourée.
  const tickAt = (index: number) => (reduced ? START : START + index * stagger.prices * 2);
  const missing = issueBeats({ startAt: reduced ? START : tickAt(MENTIONS.length) + durations.micro, reduced });
  return (
    <>
      <p className="font-mono text-label uppercase text-ink-muted">Mentions</p>
      <ul className="mt-3 space-y-2 text-[0.9rem]">
        {MENTIONS.map((mention, index) => (
          <li key={mention} className="flex items-center gap-2.5">
            <DrawnTick active={active} delay={tickAt(index)} />
            {mention}
          </li>
        ))}
        <li className="relative isolate flex items-center gap-2.5">
          <HighlighterMark id="vitrine-mention" active={active} delay={missing.highlight.start} />
          <span className="size-4 shrink-0" />
          <span>Assurance professionnelle</span>
          <span className="relative ml-auto px-1 font-mono text-xs font-semibold uppercase">
            absente
            <RedCircle id="vitrine-mention" active={active} delay={missing.circle.start} className="-inset-x-2 -inset-y-2" />
          </span>
        </li>
      </ul>
    </>
  );
}

/** Coche verte tracée au stylo, comme `PenTick`, mais qui se dessine. */
function DrawnTick({ active, delay }: { readonly active: boolean; readonly delay: number }) {
  const { reduced } = useMotionPrefs();
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="size-4 shrink-0 overflow-visible" fill="none">
      <motion.path
        d="M2.6 8.6c1.2.9 2.2 2 3 3.4 1.6-3.6 4.2-6.8 7.6-9.2"
        className="stroke-stamp-green-strong"
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={active ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
        transition={reduced ? reducedFade(delay) : transitions.circle(delay)}
      />
    </svg>
  );
}

/**
 * Jauge de l'exemple : de 400 à 1 000 €. Zone habituelle (quartiles) de 480
 * à 640 €, médiane à 550 €, devis à 890 €. Positions en fraction de la jauge.
 */
const GAUGE = { from: 400, to: 1000, low: 480, high: 640, median: 550, quoted: 890 } as const;
const at = (value: number) => (value - GAUGE.from) / (GAUGE.to - GAUGE.from);

function Prices({ active }: { readonly active: boolean }) {
  const { reduced } = useMotionPrefs();
  const slideAt = START + durations.counter;
  return (
    <>
      <p className="font-mono text-label uppercase text-ink-muted">Chauffe-eau 200 L</p>
      <div className="mt-2 flex items-baseline justify-between font-mono text-[0.95rem] tabular-nums">
        <span className="text-xs text-ink-muted">Prix du devis</span>
        <span>890,00</span>
      </div>

      {/* La jauge : zone habituelle, médiane, et le devis qui glisse à sa place. */}
      <div className="relative mt-7 h-1.5 rounded-full bg-rule">
        <span
          className="absolute inset-y-0 rounded-full bg-stamp-green/30"
          style={{ left: `${at(GAUGE.low) * 100}%`, width: `${(at(GAUGE.high) - at(GAUGE.low)) * 100}%` }}
        />
        <span className="absolute -top-1.5 h-[1.125rem] w-px bg-ink" style={{ left: `${at(GAUGE.median) * 100}%` }} />
        <motion.div
          className="absolute inset-x-0 -top-[1.15rem]"
          initial={{ x: `${at(GAUGE.median) * 100}%`, opacity: 0 }}
          animate={
            active
              ? { x: `${at(GAUGE.quoted) * 100}%`, opacity: 1 }
              : { x: `${at(GAUGE.median) * 100}%`, opacity: 0 }
          }
          transition={
            reduced
              ? reducedFade(START)
              : { x: transitions.counter(slideAt), opacity: transitions.fadeIn(START) }
          }
        >
          <span className="absolute -ml-1.5 mt-[0.55rem] block size-3 rounded-full border-2 border-paper-raised bg-stamp-orange" />
        </motion.div>
      </div>
      <div className="relative mt-2 h-4 font-mono text-[0.625rem] uppercase tracking-[0.08em] text-ink-muted">
        <span className="absolute -translate-x-1/2" style={{ left: `${at(GAUGE.median) * 100}%` }}>
          médiane
        </span>
      </div>

      <PriceDelta
        amount={340}
        source={{ kind: "loupe", comparables: 23 }}
        active={active}
        delay={START}
        className="mt-3"
      />
    </>
  );
}
