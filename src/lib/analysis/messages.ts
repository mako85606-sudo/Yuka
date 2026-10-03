import { limits } from "@/config/limits";
import type { AnalysisErrorCode, RefusalReason } from "@/lib/analysis/events";
import { fr } from "@/lib/typography";

/** Ce qu'on dit quand on ne lit pas un document. Rien n'est analysé ni conservé. */
export const REFUSAL_MESSAGES: Record<RefusalReason, string> = {
  health: fr(
    "Les devis de santé (dentaire, optique, audition…) ne sont pas encore pris en charge. Ton devis n'a été ni analysé ni conservé.",
  ),
  "not-a-quote": fr(
    "On ne voit pas de devis sur ce document. Il nous faut le devis lui-même, avec ses lignes et ses montants.",
  ),
  unreadable: fr(
    "Ce devis est trop difficile à lire. Reprends la photo à plat, bien éclairée, sans reflet, avec toute la page dans le cadre.",
  ),
};

const MAX_MEGABYTES = Math.round(limits.maxUploadBytes / (1024 * 1024));

export const ERROR_MESSAGES: Record<AnalysisErrorCode, string> = {
  "invalid-request": fr("L'envoi n'est pas arrivé entier. Réessaie."),
  "consent-required": fr("Coche la case d'accord pour qu'on puisse lire ton devis."),
  "no-file": fr("Ajoute une photo ou le PDF de ton devis."),
  "too-many-files": fr(`${limits.maxPhotos} photos au maximum, ou un seul PDF.`),
  "unsupported-file": fr(
    "Ce format n'est pas pris en charge : envoie une photo (JPEG, PNG, WebP) ou un PDF.",
  ),
  "too-large": fr(
    `C'est trop lourd : ${MAX_MEGABYTES} Mo au maximum. Essaie avec des photos plutôt qu'un PDF scanné.`,
  ),
  "forbidden-origin": fr("Cette demande ne vient pas du site de Loupe."),
  "rate-limited": fr(
    `Tu as fait tes ${limits.analysesPerDay} analyses du jour. Le compteur repart à minuit.`,
  ),
  "not-configured": fr("L'analyse n'est pas encore ouverte sur ce site. Repasse bientôt."),
  "reading-failed": fr("La lecture a échoué de notre côté. Réessaie dans un instant."),
  "server-error": fr("Petit souci de notre côté. Réessaie dans un instant."),
  network: fr("La connexion a lâché. Vérifie ton réseau et réessaie."),
  interrupted: fr("L'analyse s'est interrompue en route. Réessaie dans un instant."),
};

/** Une analyse ratée de notre fait est rendue : on le dit. */
export function failureMessage(code: "reading-failed" | "server-error", refunded: boolean): string {
  const base = ERROR_MESSAGES[code];
  return refunded ? `${base} ${fr("Cette tentative ne compte pas dans tes analyses du jour.")}` : base;
}
