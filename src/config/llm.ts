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

/**
 * Modèles qui imposent 30 jours de conservation chez Anthropic (« Covered
 * Models »), relevés le 24 octobre 2026 dans
 * https://platform.claude.com/docs/en/manage-claude/api-and-data-retention.
 * La politique de confidentialité dit qu'Anthropic ne garde rien par défaut :
 * c'est vrai seulement hors de cette liste.
 * TODO: vérifier — la liste peut s'allonger (article « Covered Models » du support d'Anthropic).
 */
export const RETAINED_MODELS = ["claude-fable-5-1", "claude-mythos-5-1", "claude-fable-5", "claude-mythos-5"] as const;

/** Vrai si Anthropic garde 30 jours ce que lit ce modèle (alias ou version datée). */
export function modelRetainsContent(model: string): boolean {
  return RETAINED_MODELS.some((retained) => model === retained || model.startsWith(`${retained}-`));
}

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

/**
 * Tarif majorant (le plus cher champ par champ parmi `MODEL_PRICING`) : sert
 * de repli pour le plafond de dépense quand `ANTHROPIC_MODEL` désigne un
 * modèle absent de la table (une version datée, par exemple). Sans lui, le
 * coût compterait pour zéro et le plafond ne se déclencherait jamais.
 */
export const MAX_MODEL_PRICING: ModelPricing = Object.values(MODEL_PRICING).reduce(
  (worst, pricing) => ({
    input: Math.max(worst.input, pricing.input),
    output: Math.max(worst.output, pricing.output),
    cacheWrite: Math.max(worst.cacheWrite, pricing.cacheWrite),
    cacheRead: Math.max(worst.cacheRead, pricing.cacheRead),
  }),
  { input: 0, output: 0, cacheWrite: 0, cacheRead: 0 },
);
