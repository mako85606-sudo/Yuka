"use client";

import { motion } from "motion/react";
import { SavingsFigure } from "@/components/analyze/AnalysisResult";
import { useMotionPrefs } from "@/components/motion/MotionPreferences";
import { VerdictBadge } from "@/components/quote/VerdictBadge";
import { ButtonLink } from "@/components/ui/Button";
import { CameraGlyph } from "@/components/ui/icons";
import type { SavingsRange } from "@/lib/analysis/result";
import { offsets, reducedFade, transitions } from "@/lib/motion";
import type { Verdict } from "@/lib/scene-quote";
import { fr } from "@/lib/typography";

interface SharedSummaryProps {
  readonly verdict: Verdict;
  readonly errors: number;
  readonly warnings: number;
  readonly savings: SavingsRange | null;
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count > 1 ? many : one}`;
}

function useAppear() {
  const { reduced } = useMotionPrefs();
  return {
    initial: { opacity: 0, y: offsets.lineRiseY },
    animate: { opacity: 1, y: 0 },
    transition: reduced ? reducedFade() : transitions.message(),
  };
}

/**
 * À côté du devis partagé : le verdict, l'économie possible et ce qui a été
 * relevé. Rien de privé : ni message de négociation, ni rappel personnel.
 */
export function SharedSummary({ verdict, errors, warnings, savings }: SharedSummaryProps) {
  const appear = useAppear();
  const counts = [
    errors > 0 ? plural(errors, "erreur vérifiée", "erreurs vérifiées") : "aucune erreur vérifiée",
    warnings > 0 ? plural(warnings, "point d'attention", "points d'attention") : null,
  ].filter(Boolean);

  return (
    <motion.section
      aria-labelledby="verdict-partage"
      className="rounded-lg border border-rule bg-paper-raised p-6 elevation-1"
      {...appear}
    >
      <h2 id="verdict-partage" className="text-sm font-semibold text-ink-muted">
        Le verdict de Loupe
      </h2>
      <VerdictBadge verdict={verdict} size="lg" className="mt-2" />
      {savings ? (
        <div className="mt-6">
          <p className="text-sm text-ink-muted">Économie possible</p>
          <SavingsFigure savings={savings} className="mt-1" />
        </div>
      ) : null}
      <p className="mt-5 border-t border-rule pt-4 text-[0.95rem] text-ink">{fr(`${counts.join(" · ")}.`)}</p>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">
        {fr(
          "Les erreurs signalées ont été vérifiées par le calcul. Pour les prix, chaque avis précise s'il vient de la base Loupe ou d'une estimation IA, moins fiable.",
        )}
      </p>
    </motion.section>
  );
}

/** Sous le devis partagé : une invitation à faire vérifier son propre devis. */
export function SharedInvite() {
  const appear = useAppear();
  return (
    <motion.section aria-labelledby="votre-devis" className="rounded-lg bg-mist p-6 sm:p-8" {...appear}>
      <h2 id="votre-devis" className="font-display text-[2rem] leading-tight text-ink">
        {fr("Un devis à faire vérifier ?")}
      </h2>
      <p className="mt-2 max-w-prose leading-relaxed text-ink-muted">
        {fr(
          "Prenez-le en photo : Loupe vérifie les calculs, les mentions et les prix en une trentaine de secondes. C'est gratuit, et votre devis est effacé juste après.",
        )}
      </p>
      <ButtonLink href="/analyse" size="lg" className="mt-5">
        <CameraGlyph />
        Scanner mon devis
      </ButtonLink>
    </motion.section>
  );
}
