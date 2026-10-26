import { count, eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { sampleExtraction } from "@/fixtures/sample-extraction";
import { readEvents, type AnalyzeEvent } from "@/lib/analysis/events";
import type { Database } from "@/server/db/client";
import { analyses, priceLines } from "@/server/db/schema";
import { ESTIMATE_TOOL_NAME } from "@/server/pricing/estimate-prices";
import {
  createFakeAnthropic,
  errorResponse,
  messageResponse,
  sseResponse,
  textEvents,
  toolUseBlock,
  toolUseEvents,
  type Responder,
} from "@/test/fake-anthropic";
import { createTestDb } from "@/test/test-db";
import { createAnalysisStream } from "./analysis-stream";

const { db, close } = await createTestDb();

afterAll(async () => {
  await close();
});

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

const reading: Responder = (_request, signal) => sseResponse(toolUseEvents(sampleExtraction), signal);
const pricing: Responder = () =>
  messageResponse([toolUseBlock(ESTIMATE_TOOL_NAME, { estimates: [{ line: 1, low: 550, high: 800 }] })]);

function stream(
  responders: readonly Responder[],
  options: { database?: Database | null; budgetMs?: number; model?: string } = {},
) {
  const fake = createFakeAnthropic(responders);
  const refund = vi.fn(async () => true);
  const settleSpend = vi.fn<(actualUsd: number, trusted: boolean) => Promise<void>>(async () => {});
  const body = createAnalysisStream({
    client: fake.client,
    model: options.model ?? "claude-sonnet-5-5",
    documents: [{ kind: "pdf", data: new TextEncoder().encode("%PDF-1.7") }],
    db: options.database === undefined ? db : options.database,
    remaining: 4,
    refund,
    settleSpend,
    budgetMs: options.budgetMs,
  });
  return { body, refund, settleSpend, requests: fake.requests };
}

async function collect(body: ReadableStream<Uint8Array>): Promise<AnalyzeEvent[]> {
  const events: AnalyzeEvent[] = [];
  for await (const event of readEvents(body)) events.push(event);
  return events;
}

async function analysisCount(): Promise<number> {
  const [row] = await db.select({ value: count() }).from(analyses);
  return row?.value ?? 0;
}

describe("createAnalysisStream", () => {
  it("enregistre l'analyse et donne son lien avec le verdict", async () => {
    const { body } = stream([reading, pricing]);
    const events = await collect(body);
    const last = events.at(-1);
    if (last?.type !== "verdict") throw new Error("verdict attendu");
    expect(last.analysisId).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(Math.abs(new Date(last.correctedAt).getTime() - Date.now())).toBeLessThan(60_000);
    expect(new Date(last.expiresAt ?? "").getTime()).toBeGreaterThan(Date.now() + 29 * 24 * 60 * 60 * 1000);

    const id = last.analysisId ?? "";
    const [row] = await db.select().from(analyses).where(eq(analyses.id, id));
    expect(row).toMatchObject({ category: "plomberie", department: "69", region: "ARA", verdict: "negotiate" });
    expect(row?.llmCostUsd).toBeGreaterThan(0);
    const lines = await db.select().from(priceLines).where(eq(priceLines.analysisId, id));
    expect(lines.map((line) => line.comparable).sort()).toEqual([false, true]);
  });

  it("affiche quand même le résultat si l'enregistrement échoue", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const broken = {
      ...db,
      select: db.select.bind(db),
      transaction: async () => {
        throw new Error("base en panne");
      },
    } as unknown as Database;
    const { body, refund } = stream([reading, pricing], { database: broken });
    const events = await collect(body);
    expect(events.at(-1)).toMatchObject({ type: "verdict", analysisId: null, expiresAt: null });
    expect(error).toHaveBeenCalledWith(expect.stringContaining("[analyse] enregistrement impossible"));
    expect(error.mock.calls.flat().join(" ")).not.toContain("base en panne");
    expect(refund).not.toHaveBeenCalled();
  });

  it("n'estime pas les prix quand la lecture a mangé tout le temps", async () => {
    const { body, requests } = stream([reading], { budgetMs: 0 });
    const events = await collect(body);
    expect(events.find((event) => event.type === "prices")).toMatchObject({ prices: [], complete: false });
    expect(events.at(-1)).toMatchObject({ type: "verdict" });
    expect(requests).toHaveLength(1);
  });

  it("ne conclut ni n'enregistre rien quand le visiteur part pendant les prix", async () => {
    const before = await analysisCount();
    // L'estimation ne répond jamais : seul le départ du visiteur l'interrompt.
    const hanging: Responder = (_request, signal) => sseResponse([], signal, { hang: true });
    const { body, settleSpend } = stream([reading, hanging]);
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let received = "";
    while (!received.includes('"step":"pricing"')) {
      const { value, done } = await reader.read();
      if (done) throw new Error("flux terminé trop tôt");
      received += decoder.decode(value, { stream: true });
    }
    await reader.cancel();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(await analysisCount()).toBe(before);
    // Visiteur parti : la réservation est gardée (solde non fiable).
    expect(settleSpend).toHaveBeenCalledTimes(1);
    expect(settleSpend.mock.calls[0]?.[1]).toBe(false);
  });

  it("solde la réservation une fois, le coût réel connu, après une analyse complète", async () => {
    const { body, settleSpend } = stream([reading, pricing]);
    await collect(body);
    expect(settleSpend).toHaveBeenCalledTimes(1);
    const [actualUsd, trusted] = settleSpend.mock.calls[0] ?? [];
    expect(actualUsd).toBeGreaterThan(0);
    expect(trusted).toBe(true);
  });

  it("compte au tarif le plus cher un modèle absent de la table des tarifs", async () => {
    const known = stream([reading, pricing]);
    await collect(known.body);
    const unknown = stream([reading, pricing], { model: "claude-sonnet-5-5-20261001" });
    await collect(unknown.body);
    const knownUsd = known.settleSpend.mock.calls[0]?.[0] ?? 0;
    const unknownUsd = unknown.settleSpend.mock.calls[0]?.[0] ?? 0;
    expect(knownUsd).toBeGreaterThan(0);
    // Même usage, tarif majorant (Opus) : jamais zéro, jamais moins.
    expect(unknownUsd).toBeGreaterThan(knownUsd);
  });

  it("ne rend pas une analyse dont la lecture, facturée, a échoué (réponse tronquée)", async () => {
    const truncated: Responder = (_request, signal) =>
      sseResponse(toolUseEvents(JSON.stringify(sampleExtraction).slice(0, 300), { stopReason: "max_tokens" }), signal);
    const { body, refund, settleSpend } = stream([truncated]);
    const events = await collect(body);
    expect(events.at(-1)).toMatchObject({ type: "error", code: "reading-failed", refunded: false });
    expect(refund).not.toHaveBeenCalled();
    // Réponse tronquée : le message est complet, le coût est fiable et soldé.
    expect(settleSpend).toHaveBeenCalledTimes(1);
    const [actualUsd, trusted] = settleSpend.mock.calls[0] ?? [];
    expect(actualUsd).toBeGreaterThan(0);
    expect(trusted).toBe(true);
  });

  it("garde la réservation quand la lecture s'interrompt (panne, tokens sous-comptés)", async () => {
    const { body, settleSpend } = stream([() => errorResponse(529, "overloaded_error", "Overloaded")]);
    await collect(body);
    expect(settleSpend).toHaveBeenCalledTimes(1);
    expect(settleSpend.mock.calls[0]?.[1]).toBe(false);
  });

  it("ne rend pas non plus une analyse refusée par le modèle", async () => {
    const refusal: Responder = (_request, signal) => sseResponse(textEvents("", { stopReason: "refusal" }), signal);
    const { body, refund } = stream([refusal]);
    const events = await collect(body);
    expect(events.at(-1)).toMatchObject({ type: "error", refunded: false });
    expect(refund).not.toHaveBeenCalled();
  });

  it("rend l'analyse quand l'API est en panne sans rien facturer", async () => {
    const { body, refund } = stream([() => errorResponse(529, "overloaded_error", "Overloaded")]);
    const events = await collect(body);
    expect(events.at(-1)).toMatchObject({ type: "error", code: "reading-failed", refunded: true });
    expect(refund).toHaveBeenCalledTimes(1);
  });
});
