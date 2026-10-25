import { describe, expect, it } from "vitest";
import { llmConfig, MODEL_PRICING, modelRetainsContent } from "@/config/llm";

describe("modèle de lecture", () => {
  it("par défaut, un modèle dont Anthropic ne garde rien", () => {
    expect(modelRetainsContent(llmConfig.defaultModel)).toBe(false);
    expect(MODEL_PRICING[llmConfig.defaultModel]).toBeDefined();
  });

  it("repère les modèles qui imposent 30 jours de conservation, versions datées comprises", () => {
    expect(modelRetainsContent("claude-fable-5-1")).toBe(true);
    expect(modelRetainsContent("claude-mythos-5-20260801")).toBe(true);
    expect(modelRetainsContent("claude-sonnet-5-5")).toBe(false);
    expect(modelRetainsContent("claude-opus-5-5")).toBe(false);
  });
});
