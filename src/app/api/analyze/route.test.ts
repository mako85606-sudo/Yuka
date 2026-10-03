import type Anthropic from "@anthropic-ai/sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { limits } from "@/config/limits";
import { sampleExtraction } from "@/fixtures/sample-extraction";
import { readEvents, type AnalyzeEvent } from "@/lib/analysis/events";
import {
  createFakeAnthropic,
  errorResponse,
  sseResponse,
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
  it("streame les étapes réelles, puis les lignes au fil de la lecture", async () => {
    useModel([(_request, signal) => sseResponse(toolUseEvents(sampleExtraction), signal)]);
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/x-ndjson");
    const events = await collect(response);
    expect(events.map((event) => event.type)).toEqual([
      "step",
      "step",
      "header",
      "line",
      "line",
      "extracted",
    ]);
    expect(events.slice(0, 2)).toEqual([
      { type: "step", step: "received" },
      { type: "step", step: "reading" },
    ]);
    expect(events.at(-1)).toMatchObject({
      type: "extracted",
      remaining: limits.analysesPerDay - 1,
      extraction: { category: "plomberie" },
    });
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

    useModel([(_request, signal) => sseResponse(toolUseEvents(sampleExtraction), signal)]);
    const retried = await collect(await POST(request({ ip })));
    expect(retried.at(-1)).toMatchObject({ remaining: limits.analysesPerDay - 1 });
  });

  it(`bloque au-delà de ${limits.analysesPerDay} analyses par jour`, async () => {
    const ip = "203.0.113.60";
    const responders = Array.from({ length: limits.analysesPerDay }, (): Responder => (_request, signal) =>
      sseResponse(toolUseEvents(sampleExtraction), signal),
    );
    useModel(responders);
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

  it("reste fermée sans clé d'API", async () => {
    fake.client = null;
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: { code: "not-configured" } });
  });
});
