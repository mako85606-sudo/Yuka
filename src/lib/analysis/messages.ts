import { limits } from "@/config/limits";
import type { AnalysisErrorCode, RefusalReason } from "@/lib/analysis/events";
import { fr } from "@/lib/typography";

/** Ce qu'on dit quand on ne lit pas un document. Rien n'est analysé ni conservé. */
export const REFUSAL_MESSAGES: Record<RefusalReason, string> = {
  health: fr(
    "Loupe ne lit pas encore les devis de santé (dentiste, opticien, audioprothésiste). On n'a rien analysé, et rien gardé.",
  ),
  "not-a-quote": fr(
    "Ce document ne ressemble pas à un devis. Il nous faut la page avec le détail des prestations et les montants.",
  ),
  unreadable: fr(
    "Impossible de lire ce devis correctement. Reprends la photo à plat, près d'une fenêtre et sans flash pour éviter les reflets, avec la page entière dans le cadre.",
  ),
};

const MAX_MEGABYTES = Math.round(limits.maxUploadBytes / (1024 * 1024));

export const ERROR_MESSAGES: Record<AnalysisErrorCode, string> = {
  "invalid-request": fr("L'envoi s'est arrêté en route. Réessaie."),
  "consent-required": fr("Coche la case d'accord pour qu'on puisse lire ton devis."),
  "no-file": fr("Ajoute une photo ou le PDF de ton devis."),
  "too-many-files": fr(`${limits.maxPhotos} photos au maximum, ou un seul PDF.`),
  "unsupported-file": fr(
    "On ne sait pas ouvrir ce type de fichier. Envoie une photo (JPEG, PNG ou WebP) ou un PDF.",
  ),
  "too-large": fr(
    `Le fichier dépasse ${MAX_MEGABYTES} Mo. Des photos prises au téléphone passeront mieux qu'un PDF scanné.`,
  ),
  "forbidden-origin": fr("Cette demande ne vient pas du site de Loupe."),
  "rate-limited": fr(
    `Tu as fait tes ${limits.analysesPerDay} analyses du jour. Le compteur repart à minuit.`,
  ),
  "not-configured": fr("L'analyse n'est pas encore ouverte sur ce site. Repasse bientôt."),
  "reading-failed": fr("On n'a pas réussi à lire ton devis, et c'est de notre faute. Réessaie dans un instant."),
  "server-error": fr("Quelque chose a planté chez nous. Réessaie dans un instant."),
  network: fr("La connexion a lâché. Vérifie ton réseau et réessaie."),
  interrupted: fr("L'analyse a été coupée avant la fin. Relance-la, ça ne prend qu'une demi-minute."),
};

/** Une analyse ratée de notre fait est rendue : on le dit. */
export function failureMessage(code: "reading-failed" | "server-error", refunded: boolean): string {
  const base = ERROR_MESSAGES[code];
  return refunded ? `${base} ${fr("Cette tentative ne compte pas dans tes analyses du jour.")}` : base;
}
