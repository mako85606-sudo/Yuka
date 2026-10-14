import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { signups } from "@/server/db/schema";
import { saveSignup } from "@/server/signups";
import { createTestDb } from "@/test/test-db";

const { db, close } = await createTestDb();

afterAll(async () => {
  await close();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("saveSignup", () => {
  it("enregistre l'adresse et sa source, une seule fois", async () => {
    const record = { email: "camille@exemple.fr", source: "landing" } as const;
    expect(await saveSignup(record, db)).toEqual({ ok: true });
    expect(await saveSignup({ ...record, source: "detailed_report" }, db)).toEqual({ ok: true });
    const rows = await db.select().from(signups);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ email: "camille@exemple.fr", source: "landing" });
  });

  it("simule sans base hors production, sans afficher l'adresse en clair", async () => {
    vi.stubEnv("VERCEL_ENV", "");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    expect(await saveSignup({ email: "camille@exemple.fr", source: "landing" }, null)).toEqual({
      ok: true,
    });
    expect(String(info.mock.calls[0]?.[0])).toContain("c***@exemple.fr");
    expect(String(info.mock.calls[0]?.[0])).not.toContain("camille@");
  });

  it("dit la vérité en production sans base", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(await saveSignup({ email: "camille@exemple.fr", source: "landing" }, null)).toEqual({
      ok: false,
      reason: "not-configured",
    });
  });
});
