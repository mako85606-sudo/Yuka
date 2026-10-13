"use client";

import { motion } from "motion/react";
import { useId, useState } from "react";
import { EmailSignup } from "@/components/landing/EmailSignup";
import { useMotionPrefs } from "@/components/motion/MotionPreferences";
import { Button } from "@/components/ui/Button";
import { track } from "@/lib/analytics";
import { offsets, reducedFade, transitions } from "@/lib/motion";
import { fr } from "@/lib/typography";

/**
 * « Rapport détaillé — 4,90 € » : rien n'est encaissé en V1. Le bouton mesure
 * l'intérêt et propose de laisser son email pour être prévenu.
 */
export function DetailedReport() {
  const { reduced } = useMotionPrefs();
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div>
      <Button
        variant="secondary"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          if (!open) track("detailed_report_clicked");
          setOpen(true);
        }}
      >
        {fr("Rapport détaillé — 4,90 €")}
      </Button>
      <div id={panelId}>
        {open ? (
          <motion.div
            className="mt-4 rounded-[4px] border border-rule bg-paper p-4"
            initial={{ opacity: 0, y: offsets.lineRiseY }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduced ? reducedFade() : transitions.message()}
          >
            <p className="font-medium text-ink">{fr("Bientôt disponible, laisse ton email pour l'avoir en premier.")}</p>
            <p className="mt-1 text-sm text-ink-muted">
              {fr("Rien à payer aujourd'hui : on te prévient quand il sort, c'est tout.")}
            </p>
            <EmailSignup source="detailed_report" className="mt-4" />
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
