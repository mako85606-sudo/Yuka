import Anthropic from "@anthropic-ai/sdk";

/**
 * Faux serveur de l'API Claude pour les tests : le vrai SDK, branché sur un
 * `fetch` qui rejoue des flux d'événements (SSE) écrits à la main. On teste
 * ainsi notre code et la façon dont le SDK assemble le flux, sans réseau.
 */

export interface SseEvent {
  readonly type: string;
  readonly [key: string]: unknown;
}

export interface FakeRequest {
  readonly url: string;
  readonly body: Record<string, unknown>;
}

export type Responder = (request: FakeRequest, signal: AbortSignal | undefined) => Response;

export function createFakeAnthropic(responders: readonly Responder[]) {
  const requests: FakeRequest[] = [];
  const fakeFetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const body = JSON.parse(typeof init?.body === "string" ? init.body : "{}") as Record<string, unknown>;
    const request = { url, body };
    requests.push(request);
    const responder = responders[requests.length - 1];
    if (!responder) throw new Error(`Requête inattendue n° ${requests.length}`);
    return responder(request, init?.signal ?? undefined);
  };
  const client = new Anthropic({
    apiKey: "cle-de-test",
    baseURL: "https://api.claude.test",
    fetch: fakeFetch,
    maxRetries: 0,
  });
  return { client, requests };
}

interface SseOptions {
  /** Le flux s'arrête après les événements sans se fermer (pour tester un délai dépassé). */
  readonly hang?: boolean;
}

export function sseResponse(
  events: readonly SseEvent[],
  signal: AbortSignal | undefined,
  { hang = false }: SseOptions = {},
): Response {
  const encoder = new TextEncoder();
  let index = 0;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      signal?.addEventListener(
        "abort",
        () => {
          try {
            controller.error(new DOMException("Requête annulée", "AbortError"));
          } catch {
            // Flux déjà fermé.
          }
        },
        { once: true },
      );
    },
    async pull(controller) {
      // Un tour de boucle entre deux événements, comme un vrai flux réseau.
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (signal?.aborted) return;
      const event = events[index];
      index += 1;
      if (event) {
        controller.enqueue(encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`));
        return;
      }
      if (hang) return new Promise<void>(() => {});
      controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } });
}

export function errorResponse(status: number, type: string, message: string): Response {
  return new Response(JSON.stringify({ type: "error", error: { type, message } }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

interface MessageOptions {
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly cacheWriteTokens?: number;
  readonly cacheReadTokens?: number;
  readonly stopReason?: string;
  /** Bloc de réflexion (texte omis, comme par défaut) avant la réponse. */
  readonly thinking?: boolean;
}

function messageStart(options: MessageOptions): SseEvent {
  return {
    type: "message_start",
    message: {
      id: "msg_test",
      type: "message",
      role: "assistant",
      model: "claude-sonnet-5-5",
      content: [],
      stop_reason: null,
      stop_sequence: null,
      usage: {
        input_tokens: options.inputTokens ?? 1500,
        output_tokens: 1,
        cache_creation_input_tokens: options.cacheWriteTokens ?? 0,
        cache_read_input_tokens: options.cacheReadTokens ?? 0,
      },
    },
  };
}

function thinkingBlock(index: number): SseEvent[] {
  return [
    {
      type: "content_block_start",
      index,
      content_block: { type: "thinking", thinking: "", signature: "" },
    },
    { type: "content_block_delta", index, delta: { type: "signature_delta", signature: "sig-test" } },
    { type: "content_block_stop", index },
  ];
}

function messageEnd(options: MessageOptions, defaultStop: string): SseEvent[] {
  return [
    {
      type: "message_delta",
      delta: { stop_reason: options.stopReason ?? defaultStop, stop_sequence: null },
      usage: { output_tokens: options.outputTokens ?? 800 },
    },
    { type: "message_stop" },
  ];
}

/** Réponse qui appelle un outil ; l'entrée arrive en fragments de `chunkSize` caractères. */
export function toolUseEvents(
  input: unknown,
  options: MessageOptions & { readonly name?: string; readonly chunkSize?: number; readonly id?: string } = {},
): SseEvent[] {
  const json = typeof input === "string" ? input : JSON.stringify(input);
  const chunkSize = options.chunkSize ?? 48;
  const index = options.thinking ? 1 : 0;
  const deltas: SseEvent[] = [];
  for (let start = 0; start < json.length; start += chunkSize) {
    deltas.push({
      type: "content_block_delta",
      index,
      delta: { type: "input_json_delta", partial_json: json.slice(start, start + chunkSize) },
    });
  }
  return [
    messageStart(options),
    ...(options.thinking ? thinkingBlock(0) : []),
    {
      type: "content_block_start",
      index,
      content_block: {
        type: "tool_use",
        id: options.id ?? "toolu_test_1",
        name: options.name ?? "enregistrer_devis",
        input: {},
      },
    },
    ...deltas,
    { type: "content_block_stop", index },
    ...messageEnd(options, "tool_use"),
  ];
}

/** Réponse en texte, sans appel d'outil. */
export function textEvents(text: string, options: MessageOptions = {}): SseEvent[] {
  return [
    messageStart(options),
    { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
    { type: "content_block_delta", index: 0, delta: { type: "text_delta", text } },
    { type: "content_block_stop", index: 0 },
    ...messageEnd(options, "end_turn"),
  ];
}
