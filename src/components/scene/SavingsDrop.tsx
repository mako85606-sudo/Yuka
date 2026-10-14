"use client";

import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect, useEffectEvent, useMemo, useRef, type ReactNode } from "react";
import { useMotionPrefs } from "@/components/motion/MotionPreferences";
import { PenTick } from "@/components/landing/PenTick";
import { chuteSchedule } from "@/lib/choreography";
import { demoSavings, type DemoQuote } from "@/lib/demo-outcome";
import { formatEuros } from "@/lib/format";
import {
  angles,
  demoLoop,
  durations,
  offsets,
  reducedFade,
  scales,
  transitions,
} from "@/lib/motion";
import { between, createRandom } from "@/lib/seeded-random";
import { fr } from "@/lib/typography";

interface SavingsDropProps {
  readonly quote: DemoQuote;
  /** Vrai quand la correction est affichée : la chute commence. */
  readonly active: boolean;
  /** Appelé quand tout est posé : la démo peut tenir, puis passer à la suite. */
  readonly onDone?: () => void;
  /** La feuille corrigée : les pièces partent de ses montants. */
  readonly children: ReactNode;
}

/** Lignes d'où partent les pièces : erreurs de calcul et prix au-dessus de la référence. */
function sourceLineIds(quote: DemoQuote): string[] {
  const ids = [
    ...quote.issues.filter((issue) => issue.kind === "calculation").map((issue) => issue.lineId),
    ...quote.prices.filter((price) => price.delta > 0).map((price) => price.lineId),
  ];
  return [...new Set(ids)];
}

/**
 * La chute, à la fin d'une démo : les euros en trop se détachent des montants
 * fautifs de la feuille, tombent dans le compteur « Économie possible », le
 * stylo souligne le montant, puis le message s'écrit, mot à mot. Pour un
 * devis correct, une coche et « rien à redire ».
 *
 * Tout est posé dès le départ, invisible (même rendu côté serveur et client) :
 * la place est réservée, rien ne bouge autour. Les pièces sont animées sur
 * place (transformations et opacité seulement), après mesure des montants.
 * Mouvement réduit ou animation passée : pas de pièces, tout apparaît d'un
 * fondu, dans son état final.
 */
export function SavingsDrop({ quote, active, onDone, children }: SavingsDropProps) {
  const { reduced, skip } = useMotionPrefs();
  const instant = reduced || skip;
  const stageRef = useRef<HTMLDivElement>(null);
  const amountRef = useRef<HTMLSpanElement>(null);
  const coinRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const pocketRef = useRef<HTMLDivElement>(null);

  const savings = demoSavings(quote);
  const words = useMemo(() => (quote.message ? quote.message.split(" ") : []), [quote.message]);
  const coinCount = savings === null ? 0 : demoLoop.coins;
  const chute = useMemo(
    () => chuteSchedule(instant ? 0 : coinCount, words.length, { startAt: durations.micro, reduced: instant }),
    [instant, coinCount, words.length],
  );

  const counter = useMotionValue(0);
  const shownAmount = useTransform(counter, (value) => formatEuros(Math.round(value), 0));
  const finalAmount = savings === null ? "" : formatEuros(savings, 0);
  const notifyDone = useEffectEvent(() => onDone?.());

  // Les pièces : mesurées au départ de la chute, puis lancées des montants fautifs vers le compteur.
  useEffect(() => {
    const coins = coinRefs.current;
    if (!active || instant || coinCount === 0) {
      for (const coin of coins) if (coin) coin.style.opacity = "0";
      return;
    }
    const stage = stageRef.current;
    const target = amountRef.current;
    if (!stage || !target) return;
    const stageBox = stage.getBoundingClientRect();
    const targetBox = target.getBoundingClientRect();
    const sources = sourceLineIds(quote)
      .map((id) => stage.querySelector(`[data-line="${id}"] [data-amount]`)?.getBoundingClientRect())
      .filter((box): box is DOMRect => box !== undefined);
    if (sources.length === 0) return;

    const random = createRandom(`chute:${quote.id}`);
    const controls = coins.slice(0, coinCount).flatMap((coin, index) => {
      const source = sources[index % sources.length];
      if (!coin || !source) return [];
      const startX = source.left + source.width / 2 - stageBox.left + between(random, -10, 10);
      const startY = source.top + source.height / 2 - stageBox.top;
      const endX = targetBox.left + targetBox.width * between(random, 0.2, 0.8) - stageBox.left;
      const endY = targetBox.top + targetBox.height / 2 - stageBox.top;
      const drift = between(random, -offsets.coinDriftX, offsets.coinDriftX);
      const spin = angles.coinSpin * between(random, 0.6, 1) * (random() < 0.5 ? -1 : 1);
      return [
        animate(
          coin,
          {
            x: [startX, startX + drift, endX],
            y: [startY, startY + offsets.coinHopY, endY],
            rotate: [0, spin],
            opacity: [0, 1, 1, 0],
          },
          transitions.coinFall(chute.coins[index]?.start ?? 0),
        ),
      ];
    });
    return () => controls.forEach((control) => control.stop());
  }, [active, instant, coinCount, quote, chute]);

  // Le compteur monte pendant que les pièces arrivent, puis se gonfle à la dernière.
  useEffect(() => {
    if (!active || savings === null) {
      counter.jump(0);
      return;
    }
    if (instant) {
      counter.jump(savings);
      return;
    }
    counter.jump(0);
    const count = animate(counter, savings, {
      ...transitions.counter(chute.counter.start),
      duration: chute.counter.duration,
    });
    const pocket = pocketRef.current;
    const pop = pocket
      ? animate(pocket, { scale: [1, scales.pocketPop, 1] }, transitions.pocketPop(chute.pop))
      : null;
    return () => {
      count.stop();
      pop?.stop();
    };
  }, [active, instant, savings, counter, chute]);

  // Le message s'écrit mot à mot (de simples éléments animés sur place, pas un composant par mot).
  useEffect(() => {
    const words = wordRefs.current;
    if (!active) {
      for (const word of words) if (word) word.style.opacity = "0";
      return;
    }
    const controls = words.flatMap((word, index) => {
      if (!word) return [];
      const delay = chute.words[index]?.start ?? 0;
      return [animate(word, { opacity: 1 }, reduced ? reducedFade(delay) : skip ? { duration: 0 } : transitions.word(delay))];
    });
    return () => controls.forEach((control) => control.stop());
  }, [active, reduced, skip, chute]);

  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(() => notifyDone(), (skip ? 0 : chute.end) * 1000);
    return () => window.clearTimeout(timer);
  }, [active, skip, chute.end]);

  const fade = (delay: number) => (reduced ? reducedFade(delay) : transitions.fadeIn(delay));

  return (
    <div ref={stageRef} className="relative">
      {children}

      <motion.div
        className="mt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: active ? 1 : 0 }}
        transition={fade(instant ? chute.counter.start : (chute.coins[0]?.start ?? 0))}
      >
        {savings === null ? (
          <div className="flex items-center gap-3 surface-paper rounded-[4px] border border-rule px-4 py-3">
            <PenTick className="size-5" />
            <p className="text-[0.95rem] text-ink">{fr("Rien à redire. Ce devis-là, tu peux le signer.")}</p>
          </div>
        ) : (
          <>
            <motion.div
              ref={pocketRef}
              className="flex items-baseline justify-between gap-4 surface-paper rounded-[4px] border border-rule px-4 py-3"
            >
              <span className="font-mono text-label uppercase text-ink-muted">Économie possible</span>
              <span className="font-mono text-[1.6rem] font-semibold leading-none tabular-nums text-ink">
                <span className="mr-2 text-[0.9rem] font-normal text-ink-muted">jusqu&apos;à</span>
                <span ref={amountRef} className="relative inline-block text-right" style={{ minWidth: `${finalAmount.length}ch` }}>
                  <motion.span>{shownAmount}</motion.span>
                  <svg
                    aria-hidden
                    className="pointer-events-none absolute -bottom-2 left-0 h-2 w-full overflow-visible"
                    viewBox="0 0 100 8"
                    preserveAspectRatio="none"
                    fill="none"
                  >
                    <motion.path
                      d="M2 5.2C22 3.4 48 2.6 70 3.6c10 .4 19 1.3 27 2.6"
                      className="stroke-pen-red"
                      strokeWidth={2.2}
                      strokeLinecap="round"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={active ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
                      transition={reduced ? reducedFade(chute.underline.start) : transitions.underline(chute.underline.start)}
                    />
                  </svg>
                </span>
              </span>
            </motion.div>

            {words.length > 0 ? (
              <div className="mt-4 flex flex-col items-end">
                <motion.p
                  className="mb-1.5 font-mono text-label uppercase text-ink-muted"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: active ? 1 : 0 }}
                  transition={fade(chute.words[0]?.start ?? 0)}
                >
                  Le message que tu pourrais envoyer
                </motion.p>
                <motion.p
                  className="max-w-[30rem] rounded-[14px] rounded-br-[4px] bg-annotation-blue px-4 py-3 text-[0.9rem] leading-snug text-paper"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: active ? 1 : 0 }}
                  transition={fade(chute.words[0]?.start ?? 0)}
                >
                  {words.map((word, index) => (
                    <span
                      key={index}
                      ref={(element) => {
                        wordRefs.current[index] = element;
                      }}
                      style={{ opacity: 0 }}
                    >
                      {index < words.length - 1 ? `${word} ` : word}
                    </span>
                  ))}
                </motion.p>
              </div>
            ) : null}
          </>
        )}
      </motion.div>

      {/* Les pièces : toujours rendues, invisibles tant qu'elles ne tombent pas. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-20">
        {Array.from({ length: demoLoop.coins }, (_, index) => (
          <span
            key={index}
            ref={(element) => {
              coinRefs.current[index] = element;
            }}
            className="coin-shadow absolute left-0 top-0 -ml-3.5 -mt-3.5 grid size-7 place-items-center rounded-full border-2 border-coin-ink/60 bg-coin font-mono text-[0.8rem] font-bold text-coin-ink"
            style={{ opacity: 0 }}
          >
            €
          </span>
        ))}
      </div>
    </div>
  );
}

