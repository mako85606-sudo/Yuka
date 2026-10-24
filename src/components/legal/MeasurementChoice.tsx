"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import {
  measurementRefused,
  measurementRefusedByBrowser,
  setMeasurementRefused,
  subscribeMeasurement,
} from "@/lib/analytics";
import { fr } from "@/lib/typography";

type Choice = "unknown" | "measured" | "refused" | "browser";

function currentChoice(): Choice {
  if (measurementRefusedByBrowser()) return "browser";
  return measurementRefused() ? "refused" : "measured";
}

const STATUS: Record<Choice, string> = {
  unknown: "",
  measured: "Vos visites sont mesurées, sans cookie ni adresse IP.",
  refused: "Vos visites ne sont plus mesurées sur ce navigateur.",
  browser: "Votre navigateur demande à ne pas être suivi (Global Privacy Control) : vos visites ne sont pas mesurées.",
};

/**
 * Droit d'opposition à la mesure d'audience, sur la page de confidentialité.
 * Le serveur ne connaît pas le choix : le premier rendu est neutre (bouton
 * inactif), puis le choix gardé dans le navigateur s'affiche.
 */
export function MeasurementChoice() {
  const choice = useSyncExternalStore<Choice>(subscribeMeasurement, currentChoice, () => "unknown");
  const [unsaved, setUnsaved] = useState(false);

  const toggle = () => {
    setUnsaved(!setMeasurementRefused(choice !== "refused"));
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-rule p-5 sm:flex-row sm:items-center sm:justify-between">
      <p aria-live="polite" className="min-h-6 text-sm text-ink">
        {fr(STATUS[choice])}
        {unsaved && choice === "refused" ? fr(" Votre navigateur bloque le stockage : ce choix vaut pour cette page.") : null}
      </p>
      <Button
        variant="secondary"
        size="sm"
        onClick={toggle}
        disabled={choice === "unknown" || choice === "browser"}
        className="shrink-0"
      >
        {choice === "refused" ? "Accepter la mesure" : "Ne plus mesurer mes visites"}
      </Button>
    </div>
  );
}
