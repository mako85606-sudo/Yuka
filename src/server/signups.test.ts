import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { signups } from "@/server/db/schema";
import { purgeOldSignups, saveSignup } from "@/server/signups";
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

  it("simule sans base en développement, sans afficher l'adresse en clair", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    expect(await saveSignup({ email: "camille@exemple.fr", source: "landing" }, null)).toEqual({
      ok: true,
    });
    expect(String(info.mock.calls[0]?.[0])).toContain("c***@exemple.fr");
    expect(String(info.mock.calls[0]?.[0])).not.toContain("camille@");
  });

  it("dit la vérité en production (ou en préversion) sans base", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(await saveSignup({ email: "camille@exemple.fr", source: "landing" }, null)).toEqual({
      ok: false,
      reason: "not-configured",
    });
  });

  it("efface les inscriptions de plus de trois ans", async () => {
    const now = new Date("2026-10-24T12:00:00Z");
    await db.insert(signups).values([
      { email: "ancienne@exemple.fr", source: "landing", createdAt: new Date("2023-10-01T00:00:00Z") },
      { email: "recente@exemple.fr", source: "landing", createdAt: new Date("2024-01-01T00:00:00Z") },
    ]);
    await purgeOldSignups(db, now);
    const emails = (await db.select().from(signups)).map((row) => row.email);
    expect(emails).toContain("recente@exemple.fr");
    expect(emails).not.toContain("ancienne@exemple.fr");
  });

  it("ne recopie jamais l'adresse en clair dans le journal d'un échec de base", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const broken = {
      insert: () => {
        throw Object.assign(new Error("Failed query: insert … params: camille.dupont@exemple.fr,landing"), {
          name: "DrizzleQueryError",
        });
      },
    } as unknown as Parameters<typeof saveSignup>[1];
    expect(await saveSignup({ email: "camille.dupont@exemple.fr", source: "landing" }, broken)).toEqual({
      ok: false,
      reason: "error",
    });
    const logged = error.mock.calls.flat().map(String).join(" ");
    expect(logged).toContain("c***@exemple.fr");
    expect(logged).not.toContain("camille.dupont");
  });
});
