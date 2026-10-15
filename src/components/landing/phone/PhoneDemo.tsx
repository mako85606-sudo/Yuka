"use client";

import { animate, motion, useInView, useMotionValue, useTransform } from "motion/react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { LogoMark } from "@/components/landing/Logo";
import { useMotionPrefs } from "@/components/motion/MotionPreferences";
import { CheckGlyph, LockGlyph } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { DemoQuote } from "@/lib/demo-outcome";
import { formatEuros } from "@/lib/format";
import { cssEase, easings, phoneDemo, springs } from "@/lib/motion";
import { describePhoneResult, phoneResult, type PhoneResult } from "@/lib/phone-demo";
import { useHydrated } from "@/lib/use-hydrated";
import { usePageVisible } from "@/lib/use-page-visible";
import { FindingCard, FrameCorners, PhoneFrame, QuotePaper, StatusBar } from "./PhoneParts";

type Scene = "photo" | "analysis" | "result";

const NEXT: Record<Scene, Scene> = { photo: "analysis", analysis: "result", result: "photo" };

/** Les vérifications annoncées pendant l'analyse, dans l'ordre où elles se font. */
const CHECKS = ["Lecture du devis", "Calculs refaits", "Mentions obligatoires", "Prix comparés"] as const;

/** Durée de chaque écran avant le suivant, en secondes. */
const HOLD: Record<Scene, number> = {
  photo: phoneDemo.photo,
  analysis: CHECKS.length * phoneDemo.check + phoneDemo.afterChecks,
  result: phoneDemo.resultHold,
};

/** Variables de la ligne de scan, jouée en CSS (globals.css, `phone-scan`). */
const SCAN_STYLE = { "--scan-d": `${phoneDemo.scan}s`, "--scan-e": cssEase(easings.inOut) } as CSSProperties;

/**
 * Le téléphone du haut de page : une boucle photo → analyse → résultat, sur
 * un devis fictif. Elle part de la photo dès l'affichage : la ligne de scan
 * tourne en CSS avant même que JavaScript ne soit prêt, puis la boucle
 * enchaîne tant que le téléphone est à l'écran et l'onglet affiché. En
 * mouvement réduit, le téléphone montre le résultat, immobile (une fois
 * l'hydratation faite : le premier rendu reste celui du serveur). Les trois
 * écrans sont empilés et se fondent : la mise en page ne bouge jamais.
 */
export function PhoneDemo({ quote, className }: { readonly quote: DemoQuote; readonly className?: string }) {
  const result = useMemo(() => phoneResult(quote), [quote]);
  const { reduced } = useMotionPrefs();
  const pageVisible = usePageVisible();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.35 });
  // `visits` : combien de fois chaque écran est apparu. Un écran rejoue ses gestes à chaque visite
  // (il est remonté au moment où il apparaît, jamais pendant qu'il s'efface).
  const [state, setState] = useState<{ readonly scene: Scene; readonly visits: Readonly<Record<Scene, number>> }>({
    scene: "photo",
    visits: { photo: 1, analysis: 0, result: 0 },
  });
  const hydrated = useHydrated();
  const playing = !reduced && pageVisible && inView;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      setState(({ scene, visits }) => {
        const next = NEXT[scene];
        return { scene: next, visits: { ...visits, [next]: visits[next] + 1 } };
      });
    }, HOLD[state.scene] * 1000);
    return () => window.clearTimeout(timer);
  }, [playing, state]);

  // En mouvement réduit, seul le résultat reste (même si la boucle avait commencé).
  const scene = hydrated && reduced ? "result" : state.scene;
  const layer = (name: Scene) => ({
    initial: false as const,
    animate: { opacity: scene === name ? 1 : 0, scale: scene === name ? 1 : phoneDemo.sceneScale },
    transition: { duration: phoneDemo.sceneFade, ease: easings.out },
    className: "absolute inset-0 flex flex-col",
  });

  return (
    <div ref={ref} className={className}>
      <p className="sr-only">{describePhoneResult(quote, result)}</p>
      <div aria-hidden className="select-none">
        <PhoneFrame>
          <motion.div {...layer("photo")}>
            <PhotoScreen key={state.visits.photo} quote={quote} shooting={playing && scene === "photo"} />
          </motion.div>
          <motion.div {...layer("analysis")}>
            <AnalysisScreen key={state.visits.analysis} quote={quote} active={scene === "analysis"} />
          </motion.div>
          <motion.div {...layer("result")}>
            <ResultScreen key={state.visits.result} quote={quote} result={result} replay={state.visits.result > 0} />
          </motion.div>
        </PhoneFrame>
      </div>
    </div>
  );
}

/** Le déclencheur s'enfonce juste avant le passage à l'analyse, et l'écran blanchit un instant. */
function shutter(shooting: boolean, from: number, to: number) {
  return shooting
    ? {
        animate: { scale: [from, from, to, from] },
        transition: { duration: phoneDemo.photo, times: [0, phoneDemo.shutterAt, phoneDemo.shutterAt + 0.05, 1], ease: easings.out },
      }
    : { animate: { scale: from } };
}

/**
 * Le viseur : la feuille cadrée par les coins verts, la ligne de scan qui la
 * parcourt (en CSS, dès l'affichage), puis la photo qui se prend (`shooting`).
 */
function PhotoScreen({ quote, shooting }: { readonly quote: DemoQuote; readonly shooting: boolean }) {
  return (
    <div className="relative flex h-full flex-col bg-ink">
      <StatusBar inverted />
      <p className="mt-[0.6em] text-center text-[0.85em] font-medium text-paper">Cadrez le devis entier</p>
      <div className="relative mx-[1.6em] mb-[1.2em] mt-[1em] flex flex-1 items-center justify-center">
        <QuotePaper quote={quote} className="w-[88%] -rotate-2" />
        <FrameCorners className="inset-0" />
        {/* La ligne de scan : un calque de la hauteur du cadre, qui descend (transform seulement). */}
        <span className="absolute inset-x-[0.3em] inset-y-0 overflow-hidden motion-reduce:hidden">
          <span className="phone-scan absolute inset-0 border-b-[0.16em] border-brand" style={SCAN_STYLE} />
        </span>
      </div>
      <div className="flex h-[6.5em] shrink-0 items-center justify-center">
        <span className="grid size-[4em] place-items-center rounded-[2em] border-[0.25em] border-paper">
          <motion.span className="size-[3em] rounded-[1.5em] bg-paper" initial={false} {...shutter(shooting, 1, phoneDemo.shutterScale)} />
        </span>
      </div>
      {/* L'éclair de la prise de vue. */}
      <motion.span
        className="pointer-events-none absolute inset-0 bg-paper"
        initial={false}
        animate={shooting ? { opacity: [0, 0, 0.5, 0] } : { opacity: 0 }}
        transition={
          shooting
            ? { duration: phoneDemo.photo, times: [0, phoneDemo.shutterAt, phoneDemo.shutterAt + 0.05, 1], ease: easings.out }
            : { duration: 0 }
        }
      />
    </div>
  );
}

/** L'analyse : les vérifications se cochent l'une après l'autre. */
function AnalysisScreen({ quote, active }: { readonly quote: DemoQuote; readonly active: boolean }) {
  const [done, setDone] = useState(0);

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setDone((count) => Math.min(CHECKS.length, count + 1)), phoneDemo.check * 1000);
    return () => window.clearInterval(timer);
  }, [active]);

  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <AppBar title="Analyse en cours" />
      {/* La barre avance d'un seul mouvement continu pendant les vérifications. */}
      <div className="mx-[1.4em] mt-[0.4em] h-[0.3em] overflow-hidden rounded-[0.15em] bg-mist">
        <motion.span
          className="block h-full origin-left bg-brand"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: active ? 1 : 0 }}
          transition={active ? { duration: CHECKS.length * phoneDemo.check, ease: easings.inOut } : { duration: 0 }}
        />
      </div>
      <div className="mx-[1.4em] mt-[1.4em] flex items-center gap-[0.8em] rounded-lg bg-mist p-[0.8em]">
        <QuotePaper quote={quote} className="w-[4.6em] shrink-0 text-[0.4em]" />
        <div className="min-w-0">
          <p className="truncate text-[0.88em] font-medium text-ink">{quote.title}</p>
          <p className="text-[0.78em] text-ink-muted">{`${quote.category} · 1 page`}</p>
        </div>
      </div>
      <ul className="mx-[1.4em] mt-[1.2em] space-y-[0.4em]">
        {CHECKS.map((check, index) => {
          const status = index < done ? "done" : index === done ? "current" : "pending";
          return (
            <li key={check} className="flex items-center gap-[0.75em] rounded-lg px-[0.2em] py-[0.55em]">
              <CheckStatus status={status} />
              <span className={cn("text-[0.92em]", status === "pending" ? "text-ink-muted" : "text-ink")}>{check}</span>
            </li>
          );
        })}
      </ul>
      <p className="mx-[1.4em] mb-[1.6em] mt-auto flex items-center justify-center gap-[0.4em] text-[0.8em] text-ink-muted">
        <LockGlyph className="size-[1.25em]" />
        La photo est effacée après lecture
      </p>
    </div>
  );
}

function CheckStatus({ status }: { readonly status: "done" | "current" | "pending" }) {
  if (status === "done") {
    return (
      <motion.span
        className="grid size-[1.6em] place-items-center rounded-[0.8em] bg-brand text-ink"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={springs.snappy}
      >
        <CheckGlyph className="size-[1.05em]" />
      </motion.span>
    );
  }
  if (status === "current") {
    return (
      <motion.span
        className="size-[1.6em] rounded-[0.8em] border-[0.18em] border-mist border-t-brand"
        animate={{ rotate: 360 }}
        transition={{ duration: phoneDemo.spinner, ease: easings.linear, repeat: Infinity }}
      />
    );
  }
  return <span className="size-[1.6em] rounded-[0.8em] border-[0.18em] border-mist" />;
}

function AppBar({ title }: { readonly title: string }) {
  return (
    <div className="flex h-[3.2em] shrink-0 items-center gap-[0.6em] px-[1.4em]">
      <LogoMark className="size-[1.6em]" />
      <p className="text-[1em] font-semibold text-ink">{title}</p>
    </div>
  );
}

/**
 * Le résultat : le verdict en petit, l'économie en grand, puis les constats.
 * `replay` : rejoué dans la boucle (compteur, cartes) ; sinon affiché tel quel.
 */
function ResultScreen({
  quote,
  result,
  replay,
}: {
  readonly quote: DemoQuote;
  readonly result: PhoneResult;
  readonly replay: boolean;
}) {
  const appear = (index: number) =>
    replay
      ? {
          initial: { opacity: 0, y: 8 },
          animate: { opacity: 1, y: 0 },
          transition: {
            duration: phoneDemo.sceneFade,
            ease: easings.out,
            delay: phoneDemo.cardsStart + index * phoneDemo.cardStagger,
          },
        }
      : {};

  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <AppBar title="Résultat" />
      <div className="flex flex-1 flex-col px-[1.4em] pb-[1.4em]">
        <div className="flex items-center gap-[0.6em]">
          <span className="rounded-sm bg-warning-soft px-[0.55em] py-[0.25em] text-[0.78em] font-semibold text-stamp-orange-strong">
            {result.verdictLabel}
          </span>
          <span className="truncate text-[0.78em] text-ink-muted">{`${quote.category} · exemple fictif`}</span>
        </div>
        {result.savings === null ? null : (
          <div className="mt-[1em]">
            <p className="text-[0.9em] text-ink-muted">Vous pouvez économiser</p>
            <p className="mt-[0.1em] flex items-baseline gap-[0.3em] text-brand-strong">
              <span className="text-[1.15em] font-medium">jusqu&apos;à</span>
              <SavingsCounter value={result.savings} replay={replay} />
            </p>
            <p className="text-[0.78em] text-ink-muted">{`sur un devis de ${result.totalTTC} TTC`}</p>
          </div>
        )}
        <div className="mt-[1.1em] space-y-[0.5em]">
          {result.findings.map((finding, index) => (
            <motion.div key={finding.id} {...appear(index)}>
              <FindingCard finding={finding} />
            </motion.div>
          ))}
        </div>
        <motion.div
          className="mt-auto flex h-[3.2em] items-center justify-center rounded-md bg-brand text-[0.95em] font-semibold text-ink"
          {...appear(result.findings.length)}
        >
          Préparer mon message
        </motion.div>
      </div>
    </div>
  );
}

/** Le montant de l'économie : la vraie valeur au rendu serveur, compté depuis zéro quand la boucle le rejoue. */
function SavingsCounter({ value, replay }: { readonly value: number; readonly replay: boolean }) {
  const amount = useMotionValue(replay ? 0 : value);
  const text = useTransform(amount, (current) => formatEuros(Math.round(current), 0));

  useEffect(() => {
    if (!replay) return;
    const controls = animate(amount, value, {
      duration: phoneDemo.counter,
      ease: easings.outStrong,
      delay: phoneDemo.sceneFade,
    });
    return () => controls.stop();
  }, [amount, replay, value]);

  return (
    <motion.span className="text-[3.6em] font-semibold leading-none tracking-[-0.04em] tabular-nums">{text}</motion.span>
  );
}
