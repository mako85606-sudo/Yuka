import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { llmConfig } from "@/config/llm";
import { serverEnv } from "@/server/env";

let cached: { readonly apiKey: string; readonly client: Anthropic } | undefined;

/** Client de l'API Claude, ou `null` si `ANTHROPIC_API_KEY` n'est pas définie. */
export function getAnthropicClient(): Anthropic | null {
  const apiKey = serverEnv().ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  if (cached?.apiKey !== apiKey) {
    cached = { apiKey, client: new Anthropic({ apiKey, maxRetries: llmConfig.sdkMaxRetries }) };
  }
  return cached.client;
}

/** Modèle de lecture : `ANTHROPIC_MODEL`, sinon le modèle par défaut. */
export function getExtractionModel(): string {
  return serverEnv().ANTHROPIC_MODEL ?? llmConfig.defaultModel;
}
