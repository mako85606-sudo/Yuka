import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const recorded = vi.hoisted(() => [] as unknown[]);

vi.mock("@/server/events/record", () => ({
  recordEvent: vi.fn(async (event: unknown) => {
    recorded.push(event);
  }),
}));
// `after` n'existe que pendant une vraie requête Next.js : ici, il exécute tout de suite.
vi.mock("next/server", () => ({ after: (task: () => unknown) => void task() }));

const { POST } = await import("@/app/api/events/route");

const visit = "5f0c2b8e-9a4d-4d2b-8f61-2c3e4a5b6c7d";

function request(body: unknown, origin = "http://localhost:3000"): Request {
  return new Request("http://localhost:3000/api/events", {
    method: "POST",
    headers: { origin, host: "localhost:3000", "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  recorded.length = 0;
  vi.stubEnv("DATABASE_URL", "");
  vi.stubEnv("POSTHOG_KEY", "");
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/events", () => {
  it("garde un événement valide et répond tout de suite", async () => {
    const response = await POST(request({ name: "upload_started", visit, props: { pages: 2, kind: "photo" } }));
    expect(response.status).toBe(204);
    expect(recorded).toEqual([{ name: "upload_started", visit, props: { pages: 2, kind: "photo" } }]);
  });

  it("refuse ce qui ne vient pas du site, ce qui est mal formé ou trop gros", async () => {
    expect((await POST(request({ name: "landing_view", visit }, "https://ailleurs.fr"))).status).toBe(403);
    expect((await POST(request("{pas du json"))).status).toBe(400);
    expect((await POST(request({ name: "landing_view", visit, props: { nom: "Dupont" } }))).status).toBe(400);
    expect((await POST(request({ name: "landing_view", visit, props: { x: "a".repeat(2000) } }))).status).toBe(413);
    expect(recorded).toEqual([]);
  });
});
