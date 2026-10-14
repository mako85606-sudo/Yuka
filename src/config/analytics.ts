/**
 * Mesure d'audience : où partent les événements et combien de temps on les
 * garde. Aucun cookie, aucun stockage sur l'appareil, aucune adresse IP
 * transmise : les événements passent par le serveur de Loupe, qui les relaie
 * à PostHog sans géolocalisation ni profil de personne.
 */
export const analyticsConfig = {
  /** Hébergement européen de PostHog. */
  posthogHost: "https://eu.i.posthog.com",
  /**
   * Durée de conservation des événements dans Postgres, en mois.
   * TODO: vérifier — repère tiré des recommandations de la CNIL sur la mesure
   * d'audience (13 mois pour les traceurs, 25 mois pour les données) ; à
   * confirmer, et à aligner avec le réglage de rétention du projet PostHog.
   */
  eventsRetentionMonths: 13,
  /** Délai d'envoi à PostHog, pour ne jamais retenir la fonction plus longtemps. */
  posthogTimeoutMs: 3_000,
} as const;
