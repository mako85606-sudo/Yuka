"use client";

import { motion } from "motion/react";
import type { ReactNode, Ref } from "react";
import { useMotionPrefs } from "@/components/motion/MotionPreferences";
import { Button, ButtonLink } from "@/components/ui/Button";
import type { AnalysisErrorCode, RefusalReason } from "@/lib/analysis/events";
import type { LiveState } from "@/lib/analysis/live-state";
import { offsets, reducedFade, transitions } from "@/lib/motion";
import { fr } from "@/lib/typography";

const REFUSAL_TITLES: Record<RefusalReason, string> = {
  health: "Pas encore pris en charge.",
  "not-a-quote": "Ce n'est pas un devis.",
  unreadable: "Trop difficile à lire.",
};

const RETRYABLE: readonly AnalysisErrorCode[] = [
  "reading-failed",
  "server-error",
  "network",
  "interrupted",
];

function plural(count: number, one: string, many: string): string {
  return `${count} ${count > 1 ? many : one}`;
}

interface AnalysisOutcomeProps {
  readonly state: LiveState;
  readonly headingRef: Ref<HTMLHeadingElement>;
  readonly onRestart: () => void;
  readonly onRetry: () => void;
}

/**
 * Ce qu'on dit à la fin : lecture réussie, document refusé, ou échec. Les
 * vérifications, les prix et le verdict viendront s'ajouter ici.
 */
export function AnalysisOutcome({ state, headingRef, onRestart, onRetry }: AnalysisOutcomeProps) {
  const { reduced } = useMotionPrefs();
  let title: string;
  let body: ReactNode;
  let actions: ReactNode;

  if (state.status === "extracted" && state.extraction) {
    const { extraction } = state;
    title = "Lecture terminée.";
    body = (
      <>
        <p className="text-[1.0625rem] leading-relaxed text-ink">
          {fr(
            `${plural(extraction.lines.length, "ligne lue", "lignes lues")}${
              extraction.readability === "partial"
                ? ", certaines avec difficulté : compare les montants avec ton devis."
                : "."
            }`,
          )}
          {extraction.documentKind === "facture"
            ? fr(" C'est une facture plutôt qu'un devis : on l'a lue quand même.")
            : null}
        </p>
        <p className="mt-2 leading-relaxed text-ink-muted">
          {fr(
            "Les contrôles (calculs, mentions obligatoires), la comparaison des prix et le verdict arrivent dans la prochaine version de Loupe.",
          )}
        </p>
        {state.remaining !== null ? (
          <p className="mt-3 text-sm text-ink-muted">
            {state.remaining === 0
              ? "C'était ta dernière analyse du jour."
              : fr(`Il te reste ${plural(state.remaining, "analyse", "analyses")} aujourd'hui.`)}
          </p>
        ) : null}
      </>
    );
    actions = <Button onClick={onRestart}>Analyser un autre devis</Button>;
  } else if (state.status === "refused" && state.refusal) {
    title = REFUSAL_TITLES[state.refusal.reason];
    body = <p className="text-[1.0625rem] leading-relaxed text-ink">{state.refusal.message}</p>;
    actions = (
      <Button onClick={onRestart}>
        {state.refusal.reason === "unreadable" ? "Reprendre la photo" : "Choisir un autre document"}
      </Button>
    );
  } else if (state.status === "error" && state.error) {
    const { code } = state.error;
    const retryable = RETRYABLE.includes(code);
    // Rien à refaire aujourd'hui : on raccompagne vers l'accueil.
    const closed = code === "rate-limited" || code === "not-configured";
    title = code === "rate-limited" ? "C'est tout pour aujourd'hui." : "Ça n'a pas marché.";
    body = <p className="text-[1.0625rem] leading-relaxed text-ink">{state.error.message}</p>;
    actions = closed ? (
      <ButtonLink href="/">Revenir à l&apos;accueil</ButtonLink>
    ) : (
      <>
        {retryable ? <Button onClick={onRetry}>Réessayer</Button> : null}
        <Button variant={retryable ? "secondary" : "primary"} onClick={onRestart}>
          Recommencer
        </Button>
      </>
    );
  } else {
    return null;
  }

  return (
    <motion.section
      aria-labelledby="issue-analyse"
      className="rounded-[4px] border border-rule bg-paper-raised p-5 sm:p-6"
      initial={{ opacity: 0, y: offsets.lineRiseY }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? reducedFade() : transitions.message()}
    >
      <h2
        id="issue-analyse"
        ref={headingRef}
        tabIndex={-1}
        className="font-display text-[1.75rem] leading-tight text-ink outline-none"
      >
        {title}
      </h2>
      <div className="mt-3">{body}</div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">{actions}</div>
    </motion.section>
  );
}
