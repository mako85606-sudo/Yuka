import { describe, expect, it } from "vitest";
import { sampleExtraction } from "@/fixtures/sample-extraction";
import type { Extraction } from "@/lib/extraction/schema";
import {
  MAX_ATTEMPTS,
  extractQuote,
  type ExtractionProgressEvent,
} from "@/server/extraction/extract-quote";
import { EXTRACTION_TOOL_NAME, type QuoteDocument } from "@/server/extraction/prompt";
import {
  createFakeAnthropic,
  errorResponse,
  sseResponse,
  textEvents,
  toolUseEvents,
  type Responder,
} from "@/test/fake-anthropic";

const photo: QuoteDocument = {
  kind: "image",
  mediaType: "image/jpeg",
  data: new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]),
};

async function run(responders: readonly Responder[], options: { attemptTimeoutMs?: number; signal?: AbortSignal } = {}) {
  const { client, requests } = createFakeAnthropic(responders);
  const events: ExtractionProgressEvent[] = [];
  const outcome = await extractQuote({
    client,
    model: "claude-sonnet-5-5",
    documents: [photo],
    onProgress: (event) => events.push(event),
    ...options,
  });
  return { outcome, events, requests };
}

function reply(events: ReturnType<typeof toolUseEvents>): Responder {
  return (_request, signal) => sseResponse(events, signal);
}

describe("extractQuote", () => {
  it("lit un devis, transmet l'en-tête puis chaque ligne, et compte le coût", async () => {
    const { outcome, events, requests } = await run([
      reply(toolUseEvents(sampleExtraction, { thinking: true, inputTokens: 1000, outputTokens: 500 })),
    ]);

    expect(outcome.kind).toBe("extracted");
    if (outcome.kind !== "extracted") return;
    expect(outcome.extraction).toEqual(sampleExtraction);
    expect(outcome.run).toMatchObject({ model: "claude-sonnet-5-5", attempts: 1 });
    // 1 000 × 2 $ + 500 × 10 $, par million de tokens.
    expect(outcome.run.costUsd).toBe(0.007);

    expect(events.map((event) => event.type)).toEqual(["header", "line", "line"]);
    expect(events[0]).toMatchObject({ header: { category: "plomberie", department: "69" } });
    expect(events.slice(1)).toEqual([
      { type: "line", index: 0, line: sampleExtraction.lines[0] },
      { type: "line", index: 1, line: expect.objectContaining({ label: "Forfait divers" }) },
    ]);
    expect(requests).toHaveLength(1);
  });

  it("envoie un outil strict, sans forcer l'appel, et la photo avant la consigne", async () => {
    const { requests } = await run([reply(toolUseEvents(sampleExtraction))]);
    const body = requests[0]?.body ?? {};

    expect(body).toMatchObject({
      model: "claude-sonnet-5-5",
      stream: true,
      tool_choice: { type: "auto", disable_parallel_tool_use: true },
      output_config: { effort: "low" },
    });
    expect(body).not.toHaveProperty("thinking");
    const [tool] = body.tools as Array<Record<string, unknown>>;
    expect(tool).toMatchObject({ name: EXTRACTION_TOOL_NAME, strict: true, eager_input_streaming: true });
    expect(tool?.input_schema).toMatchObject({ type: "object", additionalProperties: false });

    const [system] = body.system as Array<Record<string, unknown>>;
    expect(system?.cache_control).toEqual({ type: "ephemeral" });

    const [message] = body.messages as Array<{ role: string; content: Array<Record<string, unknown>> }>;
    expect(message?.content.map((block) => block.type)).toEqual(["image", "text"]);
    expect(message?.content[0]).toMatchObject({
      source: { type: "base64", media_type: "image/jpeg", data: "/9j/4AECAw==" },
    });
  });

  it("s'arrête dès qu'un devis de santé est reconnu, sans lire les lignes", async () => {
    const health: Extraction = { ...sampleExtraction, category: "sante" };
    const { outcome, events } = await run([reply(toolUseEvents(health, { chunkSize: 16 }))]);

    expect(outcome.kind).toBe("stopped");
    if (outcome.kind === "stopped") expect(outcome.reason).toBe("health");
    expect(events).toEqual([]);
  });

  it("refuse un document qui n'est pas un devis, ou illisible", async () => {
    const notQuote = await run([reply(toolUseEvents({ ...sampleExtraction, documentKind: "autre" }))]);
    expect(notQuote.outcome).toMatchObject({ kind: "stopped", reason: "not-a-quote" });

    const blurry = await run([reply(toolUseEvents({ ...sampleExtraction, readability: "poor" }))]);
    expect(blurry.outcome).toMatchObject({ kind: "stopped", reason: "unreadable" });
  });

  it("relance une seule fois avec l'erreur de validation, puis accepte la lecture corrigée", async () => {
    const invalid = { ...sampleExtraction, meta: { ...sampleExtraction.meta, quoteDate: "12/09/2026" } };
    const { outcome, events, requests } = await run([
      reply(toolUseEvents(invalid, { thinking: true, id: "toolu_invalide" })),
      reply(toolUseEvents(sampleExtraction)),
    ]);

    expect(outcome).toMatchObject({ kind: "extracted", run: { attempts: 2 } });
    expect(events.filter((event) => event.type === "restart")).toHaveLength(1);

    const retry = requests[1]?.body.messages as Array<{ role: string; content: unknown }>;
    expect(retry.map((message) => message.role)).toEqual(["user", "assistant", "user"]);
    // La réponse précédente revient telle quelle, bloc de réflexion compris.
    const assistant = retry[1]?.content as Array<{ type: string }>;
    expect(assistant.map((block) => block.type)).toEqual(["thinking", "tool_use"]);
    const [toolResult] = retry[2]?.content as Array<Record<string, unknown>>;
    expect(toolResult).toMatchObject({ type: "tool_result", tool_use_id: "toolu_invalide", is_error: true });
    expect(String(toolResult?.content)).toContain("meta.quoteDate");
  });

  it("rappelle l'outil si le modèle a répondu en texte", async () => {
    const { outcome, requests } = await run([
      reply(textEvents("Voici le devis…")),
      reply(toolUseEvents(sampleExtraction)),
    ]);
    expect(outcome.kind).toBe("extracted");
    const retry = requests[1]?.body.messages as Array<{ role: string; content: unknown }>;
    expect(String(retry[2]?.content)).toContain(EXTRACTION_TOOL_NAME);
  });

  it(`abandonne après ${MAX_ATTEMPTS} lectures invalides`, async () => {
    const invalid = { ...sampleExtraction, lines: [{ label: "Sans confiance" }] };
    const { outcome, requests } = await run([
      reply(toolUseEvents(invalid)),
      reply(toolUseEvents(invalid)),
    ]);
    expect(outcome).toMatchObject({ kind: "failed", reason: "invalid", run: { attempts: 2 } });
    expect(requests).toHaveLength(MAX_ATTEMPTS);
  });

  it("ne relance pas un refus ni une réponse tronquée", async () => {
    const refusal = await run([reply(textEvents("", { stopReason: "refusal" }))]);
    expect(refusal.outcome).toMatchObject({ kind: "failed", reason: "refusal" });
    expect(refusal.requests).toHaveLength(1);

    const truncated = await run([
      reply(toolUseEvents(JSON.stringify(sampleExtraction).slice(0, 300), { stopReason: "max_tokens" })),
    ]);
    expect(truncated.outcome).toMatchObject({ kind: "failed", reason: "truncated" });
    expect(truncated.requests).toHaveLength(1);
  });

  it("signale une API indisponible sans relancer", async () => {
    const { outcome, requests } = await run([
      () => errorResponse(529, "overloaded_error", "Overloaded"),
    ]);
    expect(outcome).toMatchObject({ kind: "failed", reason: "unavailable" });
    expect(requests).toHaveLength(1);
  });

  it("abandonne une tentative trop longue", async () => {
    const partial = toolUseEvents(sampleExtraction).slice(0, 4);
    const { outcome } = await run(
      [(_request, signal) => sseResponse(partial, signal, { hang: true })],
      { attemptTimeoutMs: 50 },
    );
    expect(outcome).toMatchObject({ kind: "failed", reason: "timeout" });
  });

  it("s'arrête si l'utilisateur s'en va", async () => {
    const controller = new AbortController();
    const partial = toolUseEvents(sampleExtraction).slice(0, 4);
    setTimeout(() => controller.abort(), 20);
    const { outcome } = await run(
      [(_request, signal) => sseResponse(partial, signal, { hang: true })],
      { signal: controller.signal },
    );
    expect(outcome).toMatchObject({ kind: "failed", reason: "aborted" });
  });
});
