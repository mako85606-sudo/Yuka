import { afterEach, describe, expect, it, vi } from "vitest";

const runPurges = vi.hoisted(() => vi.fn(async () => [] as string[]));
vi.mock("@/server/maintenance", () => ({ runPurges }));

const { GET } = await import("@/app/api/purge/route");

const SECRET = "un-secret-de-tache-planifiee";

function request(authorization?: string): Request {
  return new Request("http://localhost:3000/api/purge", {
    headers: authorization ? { authorization } : {},
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  runPurges.mockClear();
});

describe("GET /api/purge", () => {
  it("n'existe pas sans secret configuré", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await GET(request(`Bearer ${SECRET}`))).status).toBe(404);
    expect(runPurges).not.toHaveBeenCalled();
  });

  it("refuse un mauvais secret", async () => {
    vi.stubEnv("CRON_SECRET", SECRET);
    expect((await GET(request("Bearer pas-le-bon-secret-du-tout"))).status).toBe(401);
    expect((await GET(request())).status).toBe(401);
    expect(runPurges).not.toHaveBeenCalled();
  });

  it("applique les durées de conservation avec le bon secret", async () => {
    vi.stubEnv("CRON_SECRET", SECRET);
    vi.stubEnv("DATABASE_URL", "");
    expect((await GET(request(`Bearer ${SECRET}`))).status).toBe(204);
    expect(runPurges).toHaveBeenCalledTimes(1);
  });
});
