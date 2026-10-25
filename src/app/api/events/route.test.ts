import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const recorded = vi.hoisted(() => [] as unknown[]);
const pending = vi.hoisted(() => [] as unknown[]);

vi.mock("@/server/events/record", () => ({
  recordEvent: vi.fn(async (event: unknown) => {
    recorded.push(event);
  }),
}));
// `after` n'existe que pendant une vraie requête Next.js : ici, il exécute tout de suite (on attend sa fin).
vi.mock("next/server", () => ({ after: (task: () => unknown) => void pending.push(task()) }));

async function settled(): Promise<void> {
  await Promise.all(pending.splice(0));
}

const { POST } = await import("@/app/api/events/route");
const { limits } = await import("@/config/limits");

const visit = "5f0c2b8e-9a4d-4d2b-8f61-2c3e4a5b6c7d";

function request(body: unknown, origin = "http://localhost:3000", ip = "198.51.100.20"): Request {
  return new Request("http://localhost:3000/api/events", {
    method: "POST",
    headers: { origin, host: "localhost:3000", "content-type": "application/json", "x-real-ip": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  recorded.length = 0;
  pending.length = 0;
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
    await settled();
    expect(recorded).toEqual([{ name: "upload_started", visit, props: { pages: 2, kind: "photo" } }]);
  });

  it("répond pareil au-delà du quota du jour, mais ne garde plus rien", async () => {
    const event = { name: "landing_view", visit };
    for (let i = 0; i < limits.eventsPerDay + 2; i += 1) {
      expect((await POST(request(event, "http://localhost:3000", "203.0.113.50"))).status).toBe(204);
    }
    await settled();
    expect(recorded).toHaveLength(limits.eventsPerDay);
  });

  it("refuse ce qui ne vient pas du site, ce qui est mal formé ou trop gros", async () => {
    expect((await POST(request({ name: "landing_view", visit }, "https://ailleurs.fr"))).status).toBe(403);
    expect((await POST(request("{pas du json"))).status).toBe(400);
    expect((await POST(request({ name: "landing_view", visit, props: { nom: "Dupont" } }))).status).toBe(400);
    expect((await POST(request({ name: "landing_view", visit, props: { x: "a".repeat(2000) } }))).status).toBe(413);
    await settled();
    expect(recorded).toEqual([]);
  });
});
