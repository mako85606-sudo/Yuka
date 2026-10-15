import { limits } from "@/config/limits";
import type { AnalysisErrorCode, RefusalReason } from "@/lib/analysis/events";
import { fr } from "@/lib/typography";

/** Ce qu'on dit quand on ne lit pas un document. Rien n'est analysé ni conservé. */
export const REFUSAL_MESSAGES: Record<RefusalReason, string> = {
  health: fr(
    "Loupe ne prend pas encore en charge les devis de santé (dentiste, opticien, audioprothésiste). Votre document n'a été ni analysé ni conservé.",
  ),
  "not-a-quote": fr(
    "Ce document ne ressemble pas à un devis. Nous avons besoin de la page qui détaille les prestations et leurs montants.",
  ),
  unreadable: fr(
    "Impossible de lire ce devis correctement. Reprenez la photo à plat, près d'une fenêtre et sans flash pour éviter les reflets, avec la page entière dans le cadre.",
  ),
};

const MAX_MEGABYTES = Math.round(limits.maxUploadBytes / (1024 * 1024));

export const ERROR_MESSAGES: Record<AnalysisErrorCode, string> = {
  "invalid-request": fr("L'envoi s'est interrompu en cours de route. Réessayez."),
  "consent-required": fr("Cochez la case d'accord pour que nous puissions lire votre devis."),
  "no-file": fr("Ajoutez une photo ou le PDF de votre devis."),
  "too-many-files": fr(`${limits.maxPhotos} photos au maximum, ou un seul PDF.`),
  "unsupported-file": fr(
    "Ce type de fichier n'est pas pris en charge. Envoyez une photo (JPEG, PNG ou WebP) ou un PDF.",
  ),
  "too-large": fr(
    `Le fichier dépasse ${MAX_MEGABYTES} Mo. Des photos prises avec votre téléphone sont plus légères qu'un PDF scanné.`,
  ),
  "forbidden-origin": fr("Cette demande ne vient pas du site de Loupe."),
  "rate-limited": fr(
    `Vous avez utilisé vos ${limits.analysesPerDay} analyses du jour. Le compteur repart à zéro à minuit.`,
  ),
  "not-configured": fr("L'analyse n'est pas encore ouverte sur ce site. Revenez bientôt."),
  "reading-failed": fr(
    "Nous n'avons pas réussi à lire votre devis ; le problème vient de chez nous. Réessayez dans un instant.",
  ),
  "server-error": fr("Une erreur est survenue de notre côté. Réessayez dans un instant."),
  network: fr("La connexion a été interrompue. Vérifiez votre réseau, puis réessayez."),
  interrupted: fr("L'analyse s'est interrompue avant la fin. Relancez-la : cela ne prend qu'une trentaine de secondes."),
};

/** Une analyse ratée de notre fait est rendue : on le dit. */
export function failureMessage(code: "reading-failed" | "server-error", refunded: boolean): string {
  const base = ERROR_MESSAGES[code];
  return refunded ? `${base} ${fr("Cette tentative n'est pas décomptée de vos analyses du jour.")}` : base;
}
