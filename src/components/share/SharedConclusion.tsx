"use client";

import { motion } from "motion/react";
import { useMotionPrefs } from "@/components/motion/MotionPreferences";
import { ButtonLink } from "@/components/ui/Button";
import type { SavingsRange } from "@/lib/analysis/result";
import { savingsText } from "@/lib/analysis/result-view";
import { cn } from "@/lib/cn";
import { offsets, reducedFade, transitions } from "@/lib/motion";
import { VERDICT_LABELS, type Verdict } from "@/lib/scene-quote";
import { fr } from "@/lib/typography";

const VERDICT_INK: Record<Verdict, string> = {
  ok: "text-verdict-ok",
  negotiate: "text-verdict-negotiate",
  alert: "text-verdict-alert",
};

interface SharedConclusionProps {
  readonly verdict: Verdict;
  readonly errors: number;
  readonly warnings: number;
  readonly savings: SavingsRange | null;
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count > 1 ? many : one}`;
}

/**
 * Sous la feuille partagée : le verdict en clair, ce qui a été relevé, et une
 * invitation à faire corriger son propre devis. Rien de privé : ni message
 * de négociation, ni rappel personnel.
 */
export function SharedConclusion({ verdict, errors, warnings, savings }: SharedConclusionProps) {
  const { reduced } = useMotionPrefs();
  const counts = [
    errors > 0 ? plural(errors, "erreur vérifiée", "erreurs vérifiées") : "aucune erreur vérifiée",
    warnings > 0 ? plural(warnings, "point d'attention", "points d'attention") : null,
  ].filter(Boolean);

  return (
    <motion.div
      className="space-y-8"
      initial={{ opacity: 0, y: offsets.lineRiseY }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? reducedFade() : transitions.message()}
    >
      <section aria-labelledby="verdict-partage" className="rounded-[4px] border border-rule bg-paper-raised p-5 sm:p-6">
        <h2 id="verdict-partage" className="font-mono text-label uppercase text-ink-muted">
          Le verdict de Loupe
        </h2>
        <p className={cn("mt-2 font-display text-[2rem] leading-tight", VERDICT_INK[verdict])}>{VERDICT_LABELS[verdict]}</p>
        <p className="mt-2 text-[1.0625rem] text-ink">
          {fr(`${counts.join(" · ")}${savings ? ` · économie possible : ${savingsText(savings)}` : ""}.`)}
        </p>
        <p className="mt-3 text-sm text-ink-muted">
          {fr(
            "Les erreurs entourées sont vérifiées par le calcul. Les avis de prix disent leur source : base Loupe, ou estimation IA à confiance faible.",
          )}
        </p>
      </section>

      <section aria-labelledby="a-toi" className="rounded-[4px] border border-rule-strong bg-paper p-5 sm:p-6">
        <h2 id="a-toi" className="font-display text-[1.75rem] leading-tight text-ink">
          {fr("Un devis sous le coude ?")}
        </h2>
        <p className="mt-2 max-w-prose leading-relaxed text-ink-muted">
          {fr(
            "Prends-le en photo : Loupe le corrige au stylo rouge en moins de 30 secondes. Gratuit, sans compte, et le devis n'est jamais gardé.",
          )}
        </p>
        <ButtonLink href="/analyse" size="lg" className="mt-5">
          Corriger mon devis
        </ButtonLink>
      </section>
    </motion.div>
  );
}
