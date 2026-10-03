"use client";

import { motion } from "motion/react";
import { useEffect, useEffectEvent, useMemo } from "react";
import { useMotionPrefs } from "@/components/motion/MotionPreferences";
import { cn } from "@/lib/cn";
import { formatStampDate } from "@/lib/format";
import { inkSplatter, stampTilt } from "@/lib/hand-drawn";
import { offsets, reducedFade, STAMP_IMPACT, transitions } from "@/lib/motion";

export type Verdict = "ok" | "negotiate" | "alert";

interface VerdictStyle {
  /** Libellé complet, lu par les lecteurs d'écran. */
  readonly label: string;
  readonly headline: string;
  /** Seconde ligne, plus petite, calée sur la largeur de la première. */
  readonly subline?: string;
  readonly ink: string;
}

const VERDICTS: Record<Verdict, VerdictStyle> = {
  ok: { label: "Correct", headline: "Correct", ink: "text-verdict-ok" },
  negotiate: { label: "À négocier", headline: "À négocier", ink: "text-verdict-negotiate" },
  alert: {
    label: "À vérifier sérieusement",
    headline: "À vérifier",
    subline: "sérieusement",
    ink: "text-verdict-alert",
  },
};

const INK_DROPLETS = 9;

interface StampProps {
  readonly verdict: Verdict;
  /** Identifiant de l'analyse : il fixe l'inclinaison et les gouttes d'encre. */
  readonly id: string;
  /** Date imprimée dans le tampon (heure de Paris). */
  readonly date?: Date;
  /** Délai avant la chute du tampon, en secondes. */
  readonly delay?: number;
  /** Appelé quand le tampon touche la feuille (pour la faire tressaillir). */
  readonly onImpact?: () => void;
  readonly className?: string;
}

/**
 * Le tampon du verdict : double bordure, majuscules, encre légèrement
 * irrégulière, penché entre −12° et −8°. Il tombe (échelle 1,6 → 1, spring
 * rigide) et projette un bref éclat d'encre à l'impact.
 */
export function Stamp({ verdict, id, date, delay = 0, onImpact, className }: StampProps) {
  const { reduced, skip } = useMotionPrefs();
  const tilt = useMemo(() => stampTilt(id), [id]);
  const droplets = useMemo(() => inkSplatter(id, INK_DROPLETS), [id]);
  const { label, headline, subline, ink } = VERDICTS[verdict];
  const impactAt = delay + STAMP_IMPACT;
  const fireImpact = useEffectEvent(() => onImpact?.());

  useEffect(() => {
    if (reduced || skip) return;
    const timer = window.setTimeout(() => fireImpact(), impactAt * 1000);
    return () => window.clearTimeout(timer);
  }, [reduced, skip, impactAt]);

  return (
    <motion.div
      role="img"
      aria-label={`Verdict : ${label}`}
      className={cn("relative inline-block select-none", ink, className)}
      style={{ rotate: tilt }}
      initial={{ scale: offsets.stampFromScale, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={reduced ? reducedFade(delay) : transitions.stamp(delay)}
    >
      <div className="stamp-ink rounded-[7px] border-[3px] border-current p-[3px]">
        <div className="rounded-[4px] border-[1.5px] border-current px-3.5 pb-2 pt-2.5 text-center sm:px-4">
          <span className="block font-mono text-[1.3rem] font-bold uppercase leading-[0.98] tracking-[0.06em] sm:text-[1.6rem]">
            {headline}
          </span>
          {subline ? (
            <span className="mt-0.5 block font-mono text-[1.02rem] font-bold uppercase leading-none tracking-[0.04em] sm:text-[1.25rem]">
              {subline}
            </span>
          ) : null}
          {date ? (
            <span className="mt-1.5 block font-mono text-[0.625rem] font-medium uppercase tracking-[0.24em]">
              Loupe · {formatStampDate(date)}
            </span>
          ) : null}
        </div>
      </div>

      {/* Toujours rendues (même DOM côté serveur et client) ; immobiles en mouvement réduit. */}
      {droplets.map((drop, index) => (
        <motion.span
          key={index}
          aria-hidden
          className="pointer-events-none absolute rounded-full bg-current"
          style={{
            left: `${50 + drop.u * 50}%`,
            top: `${50 + drop.v * 50}%`,
            width: drop.r * 2,
            height: drop.r * 2,
            marginLeft: -drop.r,
            marginTop: -drop.r,
          }}
          initial={{ opacity: 0, scale: 0.4, x: 0, y: 0 }}
          animate={
            reduced
              ? { opacity: 0 }
              : { opacity: [0, 0.85, 0], scale: [0.4, 1, 0.6], x: drop.dx, y: drop.dy }
          }
          transition={transitions.inkBurst(impactAt)}
        />
      ))}
    </motion.div>
  );
}
