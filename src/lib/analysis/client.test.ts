import { afterEach, describe, expect, it, vi } from "vitest";
import { streamAnalysis } from "@/lib/analysis/client";
import { encodeEvent, readEvents, type AnalyzeEvent } from "@/lib/analysis/events";
import { ERROR_MESSAGES } from "@/lib/analysis/messages";

const photo = new File([new Uint8Array([0xff, 0xd8, 0xff])], "page.jpg", { type: "image/jpeg" });

function ndjson(chunks: readonly string[], { error = false } = {}): Response {
  const encoder = new TextEncoder();
  let index = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      const chunk = chunks[index];
      index += 1;
      if (chunk !== undefined) controller.enqueue(encoder.encode(chunk));
      else if (error) controller.error(new TypeError("connexion perdue"));
      else controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { "content-type": "application/x-ndjson" } });
}

async function collect(fetchImpl: () => Promise<Response>): Promise<AnalyzeEvent[]> {
  vi.stubGlobal("fetch", vi.fn(fetchImpl));
  const events: AnalyzeEvent[] = [];
  for await (const event of streamAnalysis([photo])) events.push(event);
  return events;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("readEvents", () => {
  it("recolle les événements coupés entre deux paquets", async () => {
    const line = encodeEvent({ type: "step", step: "reading" });
    const response = ndjson([line.slice(0, 7), line.slice(7), encodeEvent({ type: "restart" })]);
    const events: AnalyzeEvent[] = [];
    if (response.body) for await (const event of readEvents(response.body)) events.push(event);
    expect(events).toEqual([{ type: "step", step: "reading" }, { type: "restart" }]);
  });

  it("ignore les lignes illisibles ou inconnues", async () => {
    const response = ndjson(["pas du json\n", '{"type":"inconnu"}\n', '{"type":"step","step":"lecture"}\n']);
    const events: AnalyzeEvent[] = [];
    if (response.body) for await (const event of readEvents(response.body)) events.push(event);
    expect(events).toEqual([]);
  });
});

describe("streamAnalysis", () => {
  it("envoie l'accord et les fichiers, puis rend les événements", async () => {
    const fetchMock = vi.fn(async () =>
      ndjson([
        encodeEvent({ type: "step", step: "received" }),
        encodeEvent({ type: "refused", reason: "health", message: "Non pris en charge." }),
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);
    const events: AnalyzeEvent[] = [];
    for await (const event of streamAnalysis([photo])) events.push(event);

    expect(events.map((event) => event.type)).toEqual(["step", "refused"]);
    const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    const body = init.body as FormData;
    expect(body.get("consent")).toBe("oui");
    expect(body.getAll("files")).toHaveLength(1);
  });

  it("traduit un refus avant analyse en événement d'erreur", async () => {
    const events = await collect(async () =>
      Response.json({ error: { code: "rate-limited", message: "Limite atteinte." } }, { status: 429 }),
    );
    expect(events).toEqual([{ type: "error", code: "rate-limited", message: "Limite atteinte.", refunded: false }]);
  });

  it("comprend un refus de l'hébergeur, sans corps JSON", async () => {
    const events = await collect(async () => new Response("Request Entity Too Large", { status: 413 }));
    expect(events).toEqual([
      { type: "error", code: "too-large", message: ERROR_MESSAGES["too-large"], refunded: false },
    ]);
  });

  it("signale une coupure réseau", async () => {
    const offline = await collect(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(offline).toMatchObject([{ type: "error", code: "network" }]);

    const cut = await collect(async () => ndjson([encodeEvent({ type: "step", step: "reading" })], { error: true }));
    expect(cut.at(-1)).toMatchObject({ type: "error", code: "network" });
  });

  it("signale un flux terminé sans résultat", async () => {
    const events = await collect(async () => ndjson([encodeEvent({ type: "step", step: "reading" })]));
    expect(events.at(-1)).toMatchObject({ type: "error", code: "interrupted" });
  });
});
