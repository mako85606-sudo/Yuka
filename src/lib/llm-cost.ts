import type { ModelPricing } from "@/config/llm";

/** Tokens consommés par un ou plusieurs appels au modèle. */
export interface LlmUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheWriteTokens: number;
  readonly cacheReadTokens: number;
}

export const EMPTY_USAGE: LlmUsage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheWriteTokens: 0,
  cacheReadTokens: 0,
};

/** Forme du champ `usage` renvoyé par l'API (champs de cache facultatifs). */
export interface ApiUsage {
  readonly input_tokens: number;
  readonly output_tokens: number;
  readonly cache_creation_input_tokens?: number | null;
  readonly cache_read_input_tokens?: number | null;
}

export function usageFromApi(usage: ApiUsage | null | undefined): LlmUsage {
  if (!usage) return EMPTY_USAGE;
  return {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
  };
}

export function addUsage(a: LlmUsage, b: LlmUsage): LlmUsage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheWriteTokens: a.cacheWriteTokens + b.cacheWriteTokens,
    cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
  };
}

/**
 * Coût en dollars, ou `null` si le tarif du modèle est inconnu. Les tokens
 * d'entrée facturés plein tarif excluent ceux écrits ou lus en cache, que
 * l'API compte à part.
 */
export function costUsd(usage: LlmUsage, pricing: ModelPricing | undefined): number | null {
  if (!pricing) return null;
  const perToken = 1 / 1_000_000;
  const cost =
    usage.inputTokens * pricing.input * perToken +
    usage.outputTokens * pricing.output * perToken +
    usage.cacheWriteTokens * pricing.cacheWrite * perToken +
    usage.cacheReadTokens * pricing.cacheRead * perToken;
  return Math.round(cost * 1_000_000) / 1_000_000;
}
