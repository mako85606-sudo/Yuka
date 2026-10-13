"use client";

import { motion } from "motion/react";
import { useMotionPrefs } from "@/components/motion/MotionPreferences";
import type { Segment } from "@/lib/choreography";
import { cn } from "@/lib/cn";
import { offsets, reducedFade, transitions } from "@/lib/motion";
import type { RemarkTone, SheetRemark } from "@/lib/scene-quote";

const TONES: Record<RemarkTone, { readonly label: string; readonly className: string }> = {
  error: { label: "Manque", className: "text-pen-red-strong" },
  warning: { label: "Attention", className: "text-stamp-orange-strong" },
  unconfirmed: { label: "À vérifier", className: "text-ink-muted" },
  reminder: { label: "Rappel", className: "text-annotation-blue" },
};

interface SheetRemarksProps {
  readonly remarks: readonly SheetRemark[];
  /** Calendrier de chaque remarque, dans le même ordre. */
  readonly schedule: readonly Segment[];
  /** Vrai quand l'étape de vérification est atteinte. */
  readonly active: boolean;
  readonly compact?: boolean;
}

/**
 * Remarques du correcteur sur le devis entier (mention absente, acompte,
 * TVA, rétractation), au pied de la feuille : une étiquette imprimée qui dit
 * la nature de la remarque, puis la note manuscrite. L'explication complète
 * est lue par les lecteurs d'écran.
 */
export function SheetRemarks({ remarks, schedule, active, compact = false }: SheetRemarksProps) {
  const { reduced } = useMotionPrefs();
  if (remarks.length === 0) return null;

  return (
    <div className={cn("border-t border-rule", compact ? "px-5 py-3 sm:px-6" : "px-5 py-4 sm:px-8")}>
      <p className="font-mono text-label uppercase text-ink-muted">Remarques du correcteur</p>
      <ul className="mt-2 space-y-2">
        {remarks.map((remark, index) => {
          const delay = schedule[index]?.start ?? 0;
          const tone = TONES[remark.tone];
          return (
            <motion.li
              key={remark.id}
              aria-hidden={active ? undefined : true}
              className="flex flex-wrap items-baseline gap-x-3"
              initial={{ opacity: 0, x: offsets.noteShiftX }}
              animate={active ? { opacity: 1, x: 0 } : { opacity: 0, x: offsets.noteShiftX }}
              transition={reduced ? reducedFade(delay) : transitions.note(delay)}
            >
              <span aria-hidden className={cn("w-[5.5rem] shrink-0 font-mono text-label uppercase", tone.className)}>
                {tone.label}
              </span>
              <span aria-hidden className="min-w-0 flex-1 font-hand text-hand text-annotation-blue">
                {remark.note}
              </span>
              <span className="sr-only">{`${tone.label} : ${remark.detail}`}</span>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
