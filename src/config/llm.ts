/**
 * Réglages de l'appel au modèle pour la lecture des devis.
 *
 * Le modèle se choisit avec la variable d'environnement `ANTHROPIC_MODEL`
 * (défaut ci-dessous). Ces réglages suivent la documentation de l'API Claude
 * pour Claude Sonnet 5.5 : appel d'outil non forcé (`tool_choice: auto`, le
 * forçage renvoie une erreur 400 sur ce modèle) mais outil strict, réflexion
 * adaptative à effort bas (recommandé pour l'extraction), flux de l'entrée de
 * l'outil sans mise en tampon pour afficher les lignes au fil de la lecture.
 */
export const llmConfig = {
  defaultModel: "claude-sonnet-5-5",
  effort: "low",
  /** Large : la réflexion compte dans ce plafond, et un devis peut avoir beaucoup de lignes. */
  maxTokens: 16_000,
  /** Délai maximal d'une tentative, flux compris. */
  attemptTimeoutMs: 50_000,
  /** Relances automatiques du SDK (surcharge, coupure réseau) avant d'abandonner. */
  sdkMaxRetries: 1,
  /** Schéma garanti par l'API (sorties structurées). */
  strictTool: true,
  /** Entrée de l'outil streamée sans tampon : les lignes arrivent au fil de l'eau. */
  eagerInputStreaming: true,
  /** Met en cache le préfixe stable (outil et consignes) entre deux analyses. */
  promptCaching: true,
} as const;

export interface ModelPricing {
  /** Dollars par million de tokens. */
  readonly input: number;
  readonly output: number;
  /** Écriture en cache (durée de vie de 5 minutes). */
  readonly cacheWrite: number;
  readonly cacheRead: number;
}

/**
 * Tarifs publics de l'API Claude, en dollars par million de tokens (relevés
 * dans la documentation de l'API le 3 octobre 2026). Un modèle absent de la
 * table voit son coût journalisé comme inconnu plutôt qu'estimé au hasard.
 */
export const MODEL_PRICING: Readonly<Record<string, ModelPricing>> = {
  "claude-sonnet-5-5": { input: 2, output: 10, cacheWrite: 2.5, cacheRead: 0.2 },
  "claude-sonnet-5": { input: 2, output: 10, cacheWrite: 2.5, cacheRead: 0.2 },
  "claude-opus-5-5": { input: 4, output: 20, cacheWrite: 5, cacheRead: 0.2 },
};
