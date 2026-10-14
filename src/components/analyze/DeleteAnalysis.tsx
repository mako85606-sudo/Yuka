"use client";

import { useState, useTransition } from "react";
import { deleteAnalysisNow } from "@/app/actions/delete-analysis";
import { Button } from "@/components/ui/Button";
import { fr } from "@/lib/typography";

/**
 * « Supprimer cette analyse » : sans compte, c'est le moyen d'exercer son
 * droit à l'effacement. Deux temps (demander, confirmer) pour éviter une
 * suppression par mégarde.
 */
export function DeleteAnalysis({
  analysisId,
  onDeleted,
}: {
  readonly analysisId: string;
  /** Appelé une fois l'analyse supprimée : ce qui renvoie vers elle (partage, échéance) doit disparaître. */
  readonly onDeleted?: () => void;
}) {
  const [step, setStep] = useState<"idle" | "confirm" | "done">("idle");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  const confirm = () => {
    startTransition(async () => {
      const result = await deleteAnalysisNow(analysisId);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setStep("done");
      onDeleted?.();
      // L'adresse de l'analyse ne mène plus nulle part : on revient à celle du dépôt.
      if (window.location.pathname.includes(analysisId)) window.history.replaceState(null, "", "/analyse");
    });
  };

  if (step === "done") {
    return (
      <p role="status" className="text-sm text-ink">
        {fr("Supprimé. L'analyse et son lien de partage n'existent plus ; ce que tu vois encore disparaîtra quand tu quitteras la page.")}
      </p>
    );
  }

  return (
    <div>
      {step === "idle" ? (
        <Button variant="quiet" onClick={() => setStep("confirm")}>
          Supprimer cette analyse
        </Button>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <p className="text-sm text-ink">{fr("Supprimer pour de bon ? Le lien et le partage ne marcheront plus.")}</p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={confirm} disabled={pending}>
              {pending ? "Suppression…" : "Oui, supprimer"}
            </Button>
            <Button variant="quiet" onClick={() => setStep("idle")} disabled={pending}>
              Annuler
            </Button>
          </div>
        </div>
      )}
      <p aria-live="polite" className="mt-2 min-h-5 text-sm text-pen-red-strong">
        {message}
      </p>
    </div>
  );
}
