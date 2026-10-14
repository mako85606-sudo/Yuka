import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { MODEL_PRICING, llmConfig } from "@/config/llm";
import { cleanSubject, normalizeExtraction, normalizeLine } from "@/lib/extraction/normalize";
import {
  earlyStop,
  readProgress,
  type EarlyStop,
  type ExtractionHeader,
  type ExtractionProgress,
} from "@/lib/extraction/progress";
import {
  describeValidationError,
  extractionSchema,
  prepareRawExtraction,
  type ExtractedLine,
  type Extraction,
} from "@/lib/extraction/schema";
import { EMPTY_USAGE, addUsage, costUsd, usageFromApi, type LlmUsage } from "@/lib/llm-cost";
import {
  EXTRACTION_TOOL_NAME,
  buildExtractionTool,
  buildSystemBlocks,
  buildUserContent,
  missingToolCallMessage,
  validationRetryMessage,
  type QuoteDocument,
} from "@/server/extraction/prompt";

/**
 * Lecture d'un devis par le modèle.
 *
 * Un seul appel d'outil, streamé : l'en-tête puis chaque ligne sont transmis
 * dès qu'ils sont complets. Un devis de santé, un document qui n'est pas un
 * devis ou une photo illisible arrêtent la lecture dès que le modèle l'a dit,
 * sans attendre la suite. La réponse est validée par le schéma Zod ; en cas
 * d'échec (validation, pas d'appel d'outil, entrée illisible), une seule
 * relance, avec l'erreur. Un refus du modèle, une réponse tronquée ou une
 * erreur de l'API ne sont pas relancés.
 */

export type ExtractionProgressEvent =
  | { readonly type: "header"; readonly header: ExtractionHeader }
  | { readonly type: "line"; readonly index: number; readonly line: ExtractedLine }
  /** Relance : les lignes déjà transmises sont à oublier. */
  | { readonly type: "restart" };

export type ExtractionFailure =
  | "invalid"
  | "refusal"
  | "truncated"
  | "timeout"
  | "aborted"
  | "unavailable";

export interface ExtractionRun {
  readonly model: string;
  readonly attempts: number;
  readonly durationMs: number;
  readonly usage: LlmUsage;
  /** En dollars, `null` si le tarif du modèle est inconnu. */
  readonly costUsd: number | null;
}

export type ExtractionOutcome =
  | { readonly kind: "extracted"; readonly extraction: Extraction; readonly run: ExtractionRun }
  | { readonly kind: "stopped"; readonly reason: EarlyStop; readonly run: ExtractionRun }
  | {
      readonly kind: "failed";
      readonly reason: ExtractionFailure;
      readonly run: ExtractionRun;
      /** Pour les journaux : jamais affiché tel quel. */
      readonly detail?: string;
    };

export interface ExtractQuoteOptions {
  readonly client: Anthropic;
  readonly model: string;
  readonly documents: readonly QuoteDocument[];
  /** Annule la lecture (l'utilisateur a quitté la page). */
  readonly signal?: AbortSignal;
  readonly onProgress?: (event: ExtractionProgressEvent) => void;
  readonly attemptTimeoutMs?: number;
}

/** La tentative initiale et une seule relance. */
export const MAX_ATTEMPTS = 2;

type AttemptResult =
  | { readonly kind: "message"; readonly message: Anthropic.Message; readonly usage: LlmUsage }
  | { readonly kind: "stopped"; readonly reason: EarlyStop; readonly usage: LlmUsage }
  | {
      readonly kind: "error";
      readonly reason: "timeout" | "aborted" | "unavailable" | "unparseable";
      readonly usage: LlmUsage;
      readonly detail?: string;
    };

/** Transmet l'en-tête et chaque ligne une seule fois, nettoyés. */
class ProgressRelay {
  #headerSent = false;
  readonly #linesSent = new Set<number>();

  constructor(private readonly onProgress?: (event: ExtractionProgressEvent) => void) {}

  update(progress: ExtractionProgress) {
    if (!this.onProgress) return;
    if (!this.#headerSent && progress.header) {
      this.#headerSent = true;
      this.onProgress({
        type: "header",
        header: { ...progress.header, subject: cleanSubject(progress.header.subject) },
      });
    }
    for (const { index, line } of progress.lines) {
      if (this.#linesSent.has(index)) continue;
      this.#linesSent.add(index);
      this.onProgress({ type: "line", index, line: normalizeLine(line) });
    }
  }

  restart() {
    this.#headerSent = false;
    this.#linesSent.clear();
    this.onProgress?.({ type: "restart" });
  }
}

async function runAttempt(
  options: ExtractQuoteOptions,
  messages: Anthropic.MessageParam[],
  relay: ProgressRelay,
): Promise<AttemptResult> {
  if (options.signal?.aborted) return { kind: "error", reason: "aborted", usage: EMPTY_USAGE };

  const controller = new AbortController();
  const forwardAbort = () => controller.abort();
  options.signal?.addEventListener("abort", forwardAbort, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.attemptTimeoutMs ?? llmConfig.attemptTimeoutMs);
  let stopped: EarlyStop | undefined;

  const stream = options.client.messages.stream(
    {
      model: options.model,
      max_tokens: llmConfig.maxTokens,
      system: buildSystemBlocks(),
      tools: [buildExtractionTool()],
      // Le forçage (`any`, `tool`) est refusé par les modèles récents : la
      // consigne demande l'appel, l'outil strict garantit sa forme.
      tool_choice: { type: "auto", disable_parallel_tool_use: true },
      output_config: { effort: llmConfig.effort },
      messages,
    },
    { signal: controller.signal },
  );

  stream.on("inputJson", (_fragment, snapshot) => {
    if (stopped) return;
    const progress = readProgress(snapshot);
    const reason = earlyStop(progress);
    if (reason) {
      stopped = reason;
      controller.abort();
      return;
    }
    relay.update(progress);
  });

  try {
    const message = await stream.finalMessage();
    return { kind: "message", message, usage: usageFromApi(message.usage) };
  } catch (error) {
    const usage = usageFromApi(stream.currentMessage?.usage);
    if (stopped) return { kind: "stopped", reason: stopped, usage };
    if (timedOut) return { kind: "error", reason: "timeout", usage };
    if (options.signal?.aborted) return { kind: "error", reason: "aborted", usage };
    if (error instanceof Anthropic.APIError) {
      return {
        kind: "error",
        reason: "unavailable",
        usage,
        detail: `${error.name} ${error.status ?? ""}`.trim(),
      };
    }
    // L'entrée de l'outil, streamée sans tampon, n'a pas pu être analysée.
    return {
      kind: "error",
      reason: "unparseable",
      usage,
      detail: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", forwardAbort);
  }
}

export async function extractQuote(options: ExtractQuoteOptions): Promise<ExtractionOutcome> {
  const startedAt = Date.now();
  const relay = new ProgressRelay(options.onProgress);
  let usage = EMPTY_USAGE;
  let attempts = 0;
  let messages: Anthropic.MessageParam[] = [
    { role: "user", content: buildUserContent(options.documents) },
  ];

  const run = (): ExtractionRun => ({
    model: options.model,
    attempts,
    durationMs: Date.now() - startedAt,
    usage,
    costUsd: costUsd(usage, MODEL_PRICING[options.model]),
  });
  const failed = (reason: ExtractionFailure, detail?: string): ExtractionOutcome => ({
    kind: "failed",
    reason,
    run: run(),
    detail,
  });

  while (attempts < MAX_ATTEMPTS) {
    attempts += 1;
    if (attempts > 1) relay.restart();
    const canRetry = attempts < MAX_ATTEMPTS;

    const result = await runAttempt(options, messages, relay);
    usage = addUsage(usage, result.usage);

    if (result.kind === "stopped") return { kind: "stopped", reason: result.reason, run: run() };
    if (result.kind === "error") {
      if (result.reason !== "unparseable") return failed(result.reason, result.detail);
      // Rien à quoi répondre : la même demande est simplement renvoyée.
      if (canRetry) continue;
      return failed("invalid", result.detail);
    }

    const { message } = result;
    if (message.stop_reason === "refusal") return failed("refusal");
    if (message.stop_reason === "max_tokens") return failed("truncated");

    const toolUse = message.content.find(
      (block): block is Anthropic.ToolUseBlock =>
        block.type === "tool_use" && block.name === EXTRACTION_TOOL_NAME,
    );
    if (!toolUse) {
      if (!canRetry) return failed("invalid", "aucun appel d'outil");
      messages = [
        ...messages,
        { role: "assistant", content: message.content },
        { role: "user", content: missingToolCallMessage() },
      ];
      continue;
    }

    const parsed = extractionSchema.safeParse(prepareRawExtraction(toolUse.input));
    if (parsed.success) {
      const reason = earlyStop(parsed.data);
      if (reason) return { kind: "stopped", reason, run: run() };
      return { kind: "extracted", extraction: normalizeExtraction(parsed.data), run: run() };
    }

    const errors = describeValidationError(parsed.error);
    if (!canRetry) return failed("invalid", errors);
    messages = [
      ...messages,
      { role: "assistant", content: message.content },
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: toolUse.id,
            is_error: true,
            content: validationRetryMessage(errors),
          },
        ],
      },
    ];
  }

  return failed("invalid");
}
