"use client";

import { motion } from "motion/react";
import { useMotionPrefs } from "@/components/motion/MotionPreferences";
import { Tag, type TagTone } from "@/components/ui/Tag";
import type { Segment } from "@/lib/choreography";
import { cn } from "@/lib/cn";
import { offsets, reducedFade, transitions } from "@/lib/motion";
import type { RemarkTone, SheetRemark } from "@/lib/scene-quote";

const TONES: Record<RemarkTone, { readonly label: string; readonly tone: TagTone }> = {
  error: { label: "Manque", tone: "error" },
  warning: { label: "Attention", tone: "warning" },
  unconfirmed: { label: "À vérifier", tone: "unconfirmed" },
  reminder: { label: "Rappel", tone: "reminder" },
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
 * Remarques sur le devis entier (mention absente, acompte, TVA,
 * rétractation), au pied du devis : une pastille qui dit la nature de la
 * remarque, puis la note. L'explication complète est lue par les lecteurs
 * d'écran.
 */
export function SheetRemarks({ remarks, schedule, active, compact = false }: SheetRemarksProps) {
  const { reduced } = useMotionPrefs();
  if (remarks.length === 0) return null;

  return (
    <div className={cn("border-t border-rule py-4", compact ? "px-5" : "px-5 sm:px-7")}>
      <p className="text-sm font-semibold text-ink">Remarques sur le devis</p>
      <ul className="mt-3 space-y-2.5">
        {remarks.map((remark, index) => {
          const delay = schedule[index]?.start ?? 0;
          const tone = TONES[remark.tone];
          return (
            <motion.li
              key={remark.id}
              aria-hidden={active ? undefined : true}
              className="flex items-start gap-3"
              initial={{ opacity: 0, x: offsets.noteShiftX }}
              animate={active ? { opacity: 1, x: 0 } : { opacity: 0, x: offsets.noteShiftX }}
              transition={reduced ? reducedFade(delay) : transitions.note(delay)}
            >
              <Tag tone={tone.tone} className="mt-px w-[5.75rem] shrink-0 justify-center">
                {tone.label}
              </Tag>
              <span aria-hidden className="min-w-0 flex-1 text-sm leading-relaxed text-ink">
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
