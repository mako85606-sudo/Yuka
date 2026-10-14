"use client";

import { motion } from "motion/react";
import { useEffect, useEffectEvent, useMemo } from "react";
import { useMotionPrefs } from "@/components/motion/MotionPreferences";
import { cn } from "@/lib/cn";
import { formatStampDate } from "@/lib/format";
import { inkSplatter, stampTilt } from "@/lib/hand-drawn";
import { offsets, reducedFade, STAMP_IMPACT, transitions } from "@/lib/motion";
import { VERDICT_LABELS, type Verdict } from "@/lib/scene-quote";

export type { Verdict };

interface VerdictStyle {
  /** Libellé complet, lu par les lecteurs d'écran. */
  readonly label: string;
  readonly headline: string;
  /** Seconde ligne, plus petite, calée sur la largeur de la première. */
  readonly subline?: string;
  readonly ink: string;
}

const VERDICTS: Record<Verdict, VerdictStyle> = {
  ok: { label: VERDICT_LABELS.ok, headline: "Correct", ink: "text-verdict-ok" },
  negotiate: { label: VERDICT_LABELS.negotiate, headline: "À négocier", ink: "text-verdict-negotiate" },
  alert: {
    label: VERDICT_LABELS.alert,
    headline: "À vérifier",
    subline: "sérieusement",
    ink: "text-verdict-alert",
  },
};

/** Tailles de texte : `md` sur une feuille pleine, `sm` sur une feuille compacte. */
const SIZES = {
  md: {
    headline: "text-[1.3rem] sm:text-[1.6rem]",
    subline: "text-[1.02rem] sm:text-[1.25rem]",
    padding: "px-3.5 pb-2 pt-2.5 sm:px-4",
  },
  sm: {
    headline: "text-[1.02rem] sm:text-[1.25rem]",
    subline: "text-[0.8rem] sm:text-[0.98rem]",
    padding: "px-2.5 pb-1.5 pt-2 sm:px-3",
  },
} as const;

const INK_DROPLETS = 9;

interface StampProps {
  readonly verdict: Verdict;
  /** Identifiant de l'analyse : il fixe l'inclinaison et les gouttes d'encre. */
  readonly id: string;
  /** Date imprimée dans le tampon (heure de Paris), en taille `md` seulement. */
  readonly date?: Date;
  /** Faux : le tampon attend, invisible. Vrai : il tombe (après `delay`). */
  readonly active?: boolean;
  /** Délai avant la chute du tampon, en secondes, compté depuis l'activation. */
  readonly delay?: number;
  /** Appelé quand le tampon touche la feuille (pour la faire tressaillir). */
  readonly onImpact?: () => void;
  readonly size?: keyof typeof SIZES;
  readonly className?: string;
}

/**
 * Le tampon du verdict : double bordure, majuscules, encre légèrement
 * irrégulière, penché entre −12° et −8°. Il tombe (échelle 1,6 → 1, spring
 * rigide) et projette un bref éclat d'encre à l'impact.
 */
export function Stamp({
  verdict,
  id,
  date,
  active = true,
  delay = 0,
  onImpact,
  size = "md",
  className,
}: StampProps) {
  const { reduced, skip } = useMotionPrefs();
  const tilt = useMemo(() => stampTilt(id), [id]);
  const droplets = useMemo(() => inkSplatter(id, INK_DROPLETS), [id]);
  const { label, headline, subline, ink } = VERDICTS[verdict];
  const sizes = SIZES[size];
  const impactAt = delay + STAMP_IMPACT;
  const fireImpact = useEffectEvent(() => onImpact?.());

  useEffect(() => {
    if (!active || reduced || skip) return;
    const timer = window.setTimeout(() => fireImpact(), impactAt * 1000);
    return () => window.clearTimeout(timer);
  }, [active, reduced, skip, impactAt]);

  return (
    <motion.div
      role="img"
      aria-label={`Verdict : ${label}`}
      aria-hidden={active ? undefined : true}
      className={cn("relative inline-block select-none", ink, className)}
      style={{ rotate: tilt }}
      initial={{ scale: offsets.stampFromScale, opacity: 0 }}
      animate={active ? { scale: 1, opacity: 1 } : { scale: offsets.stampFromScale, opacity: 0 }}
      transition={reduced ? reducedFade(delay) : transitions.stamp(delay)}
    >
      <div className="stamp-ink rounded-[7px] border-[3px] border-current p-[3px]">
        <div className={cn("rounded-[4px] border-[1.5px] border-current text-center", sizes.padding)}>
          <span
            className={cn(
              "block font-mono font-bold uppercase leading-[0.98] tracking-[0.06em]",
              sizes.headline,
            )}
          >
            {headline}
          </span>
          {subline ? (
            <span
              className={cn(
                "mt-0.5 block font-mono font-bold uppercase leading-none tracking-[0.04em]",
                sizes.subline,
              )}
            >
              {subline}
            </span>
          ) : null}
          {date && size === "md" ? (
            <span className="mt-1.5 block whitespace-nowrap font-mono text-[0.625rem] font-medium uppercase tracking-[0.24em]">
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
            active && !reduced
              ? { opacity: [0, 0.85, 0], scale: [0.4, 1, 0.6], x: drop.dx, y: drop.dy }
              : { opacity: 0 }
          }
          transition={transitions.inkBurst(impactAt)}
        />
      ))}
    </motion.div>
  );
}
