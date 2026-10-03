import { describe, expect, it } from "vitest";
import { MODEL_PRICING } from "@/config/llm";
import { EMPTY_USAGE, addUsage, costUsd, usageFromApi } from "@/lib/llm-cost";

describe("coût d'un appel", () => {
  it("lit l'usage renvoyé par l'API, champs de cache compris", () => {
    expect(
      usageFromApi({
        input_tokens: 1200,
        output_tokens: 900,
        cache_creation_input_tokens: 2500,
        cache_read_input_tokens: null,
      }),
    ).toEqual({ inputTokens: 1200, outputTokens: 900, cacheWriteTokens: 2500, cacheReadTokens: 0 });
    expect(usageFromApi(undefined)).toEqual(EMPTY_USAGE);
  });

  it("additionne deux tentatives", () => {
    const a = { inputTokens: 1, outputTokens: 2, cacheWriteTokens: 3, cacheReadTokens: 4 };
    expect(addUsage(a, a)).toEqual({ inputTokens: 2, outputTokens: 4, cacheWriteTokens: 6, cacheReadTokens: 8 });
  });

  it("applique les tarifs de Claude Sonnet 5.5", () => {
    const usage = {
      inputTokens: 1_000_000,
      outputTokens: 100_000,
      cacheWriteTokens: 200_000,
      cacheReadTokens: 1_000_000,
    };
    // 2 $ + 1 $ + 0,50 $ + 0,20 $
    expect(costUsd(usage, MODEL_PRICING["claude-sonnet-5-5"])).toBe(3.7);
  });

  it("renvoie null pour un modèle au tarif inconnu", () => {
    expect(costUsd(EMPTY_USAGE, MODEL_PRICING["modele-inconnu"])).toBeNull();
  });
});
