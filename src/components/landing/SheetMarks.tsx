"use client";

import { useMemo, type CSSProperties } from "react";
import { HandText } from "@/components/signature/HandText";
import { InkStroke } from "@/components/signature/InkStroke";
import type { PenBeats, Segment } from "@/lib/choreography";
import {
  connectorPath,
  HIGHLIGHTER_VIEWBOX,
  highlighterShape,
  inkStroke,
  penLoop,
  penTick,
  penUnderline,
} from "@/lib/hand-drawn";
import type { HeroMark } from "@/lib/hero-sheet";
import { angles, cssGesture, easings, type CubicBezier } from "@/lib/motion";

/**
 * Les gestes du correcteur sur une ligne de devis, partagés par la feuille du
 * hero et celle de « Comment ça marche » : même stylo, même langage.
 *
 * Repères des traits, en px pour un texte de 16 px (ils suivent la taille du
 * texte de la feuille) : la boucle autour d'un montant, le soulignement, la
 * coche, le trait de la note de marge.
 */
const LOOP = { width: 80, height: 34 } as const;
const UNDERLINE = { width: 66, height: 12 } as const;
const TICK = { width: 17, height: 15 } as const;
const LINK = { width: 22, height: 18, from: { x: 20, y: 13 }, to: { x: 2, y: 7 } } as const;
const PEN_WIDTH = { min: 0.9, max: 2.6 } as const;

/** Les gestes d'une ligne, sur grand et sur petit écran. */
export interface PenTiming {
  readonly wide: PenBeats;
  readonly narrow: PenBeats;
}

/** Variables CSS d'un geste, avec son départ sur petit écran. */
export function gesture(wide: Segment, narrow: Segment, ease: CubicBezier = easings.out): CSSProperties {
  return cssGesture({ start: wide.start, duration: wide.duration, ease, narrowStart: narrow.start });
}

/** Ce que le stylo fait autour du montant : cercle et chiffre corrigé, soulignement, ou coche. */
export function AmountMarks({ id, mark, timing }: { readonly id: string; readonly mark: HeroMark; readonly timing: PenTiming }) {
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
export function MarginMarks({ id, mark, timing }: { readonly id: string; readonly mark: HeroMark; readonly timing: PenTiming }) {
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
export function Highlight({ id, timing }: { readonly id: string; readonly timing: PenTiming }) {
  const shape = useMemo(() => highlighterShape(id), [id]);
  return (
    <span className="gesture gesture-sweep pointer-events-none absolute -inset-x-[0.35em] -inset-y-[0.12em] z-10 mix-blend-multiply" style={gesture(timing.wide.circle, timing.narrow.circle)}>
      <svg className="block h-full w-full" viewBox={`0 0 ${HIGHLIGHTER_VIEWBOX.width} ${HIGHLIGHTER_VIEWBOX.height}`} preserveAspectRatio="none">
        <path d={shape} className="fill-highlighter-mark" />
      </svg>
    </span>
  );
}
