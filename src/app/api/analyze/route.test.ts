import type Anthropic from "@anthropic-ai/sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { limits } from "@/config/limits";
import { sampleExtraction } from "@/fixtures/sample-extraction";
import { readEvents, type AnalyzeEvent } from "@/lib/analysis/events";
import { ERROR_MESSAGES, MISSING_API_KEY_DEV_MESSAGE } from "@/lib/analysis/messages";
import { ESTIMATE_TOOL_NAME } from "@/server/pricing/estimate-prices";
import {
  createFakeAnthropic,
  errorResponse,
  messageResponse,
  sseResponse,
  toolUseBlock,
  toolUseEvents,
  type Responder,
} from "@/test/fake-anthropic";

const fake = vi.hoisted(() => ({ client: null as Anthropic | null }));

vi.mock("@/server/anthropic", () => ({
  getAnthropicClient: () => fake.client,
  getExtractionModel: () => "claude-sonnet-5-5",
}));

// `after` n'existe que pendant une vraie requête Next.js.
vi.mock("next/server", () => ({ after: vi.fn() }));

const { POST } = await import("@/app/api/analyze/route");

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 1, 2, 3]);
let ipCounter = 0;

function request({
  consent = "oui",
  files = [new File([JPEG], "page.jpg", { type: "image/jpeg" })],
  origin = "http://localhost:3000",
  ip,
}: { consent?: string; files?: File[]; origin?: string; ip?: string } = {}): Request {
  const body = new FormData();
  body.set("consent", consent);
  for (const file of files) body.append("files", file);
  return new Request("http://localhost:3000/api/analyze", {
    method: "POST",
    headers: { origin, host: "localhost:3000", "x-real-ip": ip ?? `198.51.100.${(ipCounter += 1)}` },
    body,
  });
}

const reading: Responder = (_request, signal) => sseResponse(toolUseEvents(sampleExtraction), signal);
// Sans base, le chauffe-eau du devis (890 € HT) est comparé à une estimation IA.
const pricing: Responder = () =>
  messageResponse([toolUseBlock(ESTIMATE_TOOL_NAME, { estimates: [{ line: 1, low: 550, high: 800 }] })]);

function useModel(responders: readonly Responder[]) {
  const { client, requests } = createFakeAnthropic(responders);
  fake.client = client;
  return requests;
}

async function collect(response: Response): Promise<AnalyzeEvent[]> {
  const events: AnalyzeEvent[] = [];
  if (!response.body) return events;
  for await (const event of readEvents(response.body)) events.push(event);
  return events;
}

beforeEach(() => {
  vi.stubEnv("VERCEL_ENV", "");
  vi.stubEnv("DATABASE_URL", "");
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  fake.client = null;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/analyze", () => {
  it("streame les étapes réelles : lecture ligne à ligne, vérifications, prix, verdict", async () => {
    const requests = useModel([reading, pricing]);
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/x-ndjson");
    const events = await collect(response);
    expect(events.map((event) => (event.type === "step" ? event.step : event.type))).toEqual([
      "received",
      "reading",
      "header",
      "line",
      "line",
      "extracted",
      "checking",
      "checks",
      "pricing",
      "prices",
      "verdict",
      "verdict",
    ]);
    expect(events.find((event) => event.type === "extracted")).toMatchObject({
      remaining: limits.analysesPerDay - 1,
      extraction: { category: "plomberie" },
    });

    const checks = events.find((event) => event.type === "checks");
    if (checks?.type !== "checks") throw new Error("constats attendus");
    expect(checks.findings.map((finding) => finding.ruleId)).toEqual(
      expect.arrayContaining(["mention-insurance", "vague-line"]),
    );

    const prices = events.find((event) => event.type === "prices");
    expect(prices).toMatchObject({
      complete: true,
      prices: [{ lineIndex: 0, source: { kind: "ai" }, reference: { low: 550, high: 800 }, delta: 90 }],
    });
    expect(requests).toHaveLength(2);

    // Sans base configurée, le résultat s'affiche mais n'a pas de lien.
    expect(events.at(-1)).toMatchObject({
      type: "verdict",
      result: { verdict: "negotiate" },
      analysisId: null,
      expiresAt: null,
    });
  });

  it("conclut même quand l'estimation des prix échoue", async () => {
    useModel([reading, () => errorResponse(529, "overloaded_error", "Surcharge")]);
    const events = await collect(await POST(request()));
    expect(events.find((event) => event.type === "prices")).toMatchObject({ prices: [], complete: false });
    expect(events.at(-1)).toMatchObject({ type: "verdict" });
  });

  it("refuse poliment un devis de santé, sans rien lire de plus", async () => {
    useModel([
      (_request, signal) => sseResponse(toolUseEvents({ ...sampleExtraction, category: "sante" }), signal),
    ]);
    const events = await collect(await POST(request()));
    expect(events.at(-1)).toMatchObject({ type: "refused", reason: "health" });
    expect(events.some((event) => event.type === "line")).toBe(false);
  });

  it("rend l'analyse quand la lecture échoue de notre côté", async () => {
    const ip = "203.0.113.50";
    useModel([() => errorResponse(500, "api_error", "Erreur interne")]);
    const failed = await collect(await POST(request({ ip })));
    expect(failed.at(-1)).toMatchObject({ type: "error", code: "reading-failed", refunded: true });

    useModel([reading, pricing]);
    const retried = await collect(await POST(request({ ip })));
    expect(retried.find((event) => event.type === "extracted")).toMatchObject({
      remaining: limits.analysesPerDay - 1,
    });
  });

  it(`bloque au-delà de ${limits.analysesPerDay} analyses par jour`, async () => {
    const ip = "203.0.113.60";
    useModel(Array.from({ length: limits.analysesPerDay }, () => [reading, pricing]).flat());
    for (let i = 0; i < limits.analysesPerDay; i += 1) await collect(await POST(request({ ip })));
    const response = await POST(request({ ip }));
    expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({ error: { code: "rate-limited" } });
  });

  it("refuse avant toute lecture : origine, accord, fichier", async () => {
    const requests = useModel([]);
    expect((await POST(request({ origin: "https://ailleurs.fr" }))).status).toBe(403);
    expect((await POST(request({ consent: "non" }))).status).toBe(400);
    const notImage = new File([new TextEncoder().encode("bonjour")], "devis.jpg", { type: "image/jpeg" });
    const response = await POST(request({ files: [notImage] }));
    expect(response.status).toBe(415);
    expect(await response.json()).toMatchObject({ error: { code: "unsupported-file" } });
    expect(requests).toHaveLength(0);
  });

  it("reste fermée sans clé d'API, avec le message public", async () => {
    fake.client = null;
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: { code: "not-configured", message: ERROR_MESSAGES["not-configured"] },
    });
  });

  it("dit en développement quelle clé manque et comment l'ajouter", async () => {
    fake.client = null;
    vi.stubEnv("NODE_ENV", "development");
    const response = await POST(request());
    expect(response.status).toBe(503);
    const body = (await response.json()) as { error: { code: string; message: string } };
    expect(body.error).toEqual({ code: "not-configured", message: MISSING_API_KEY_DEV_MESSAGE });
    expect(body.error.message).toContain("ANTHROPIC_API_KEY");
  });
});
