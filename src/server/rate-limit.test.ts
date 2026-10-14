import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { limits } from "@/config/limits";
import {
  consumeAnalysisQuota,
  createDatabaseQuotaStore,
  createMemoryQuotaStore,
  parisDay,
  purgeExpiredQuotas,
  quotaKey,
  refundAnalysisQuota,
  type QuotaStore,
} from "@/server/rate-limit";
import { createTestDb } from "@/test/test-db";

const { db, close } = await createTestDb();

afterAll(async () => {
  await close();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const LIMIT = limits.analysesPerDay;
let counter = 0;
const freshKey = () => `cle-${(counter += 1)}`;

describe.each([
  ["Postgres", () => createDatabaseQuotaStore(db)],
  ["mémoire", () => createMemoryQuotaStore()],
] as const)("compteur %s", (_name, makeStore: () => QuotaStore) => {
  const store = makeStore();

  it(`laisse passer ${LIMIT} analyses par jour, pas une de plus`, async () => {
    const key = freshKey();
    const results = [];
    for (let i = 0; i < LIMIT + 2; i += 1) results.push(await store.consume(key, "2026-10-03", LIMIT));
    expect(results).toEqual([1, 2, 3, 4, 5, null, null]);
  });

  it("ne laisse pas passer deux envois simultanés de trop", async () => {
    const key = freshKey();
    const results = await Promise.all(
      Array.from({ length: 12 }, () => store.consume(key, "2026-10-03", LIMIT)),
    );
    expect(results.filter((count) => count !== null)).toHaveLength(LIMIT);
  });

  it("rend une analyse ratée", async () => {
    const key = freshKey();
    for (let i = 0; i < LIMIT; i += 1) await store.consume(key, "2026-10-03", LIMIT);
    expect(await store.consume(key, "2026-10-03", LIMIT)).toBeNull();
    await store.refund(key, "2026-10-03");
    expect(await store.consume(key, "2026-10-03", LIMIT)).toBe(LIMIT);
  });

  it("repart de zéro le lendemain", async () => {
    const key = freshKey();
    for (let i = 0; i < LIMIT; i += 1) await store.consume(key, "2026-10-03", LIMIT);
    expect(await store.consume(key, "2026-10-04", LIMIT)).toBe(1);
  });

  it("efface les anciens compteurs", async () => {
    const key = freshKey();
    await store.consume(key, "2026-09-01", LIMIT);
    await store.purgeBefore("2026-10-02");
    expect(await store.consume(key, "2026-09-01", LIMIT)).toBe(1);
  });
});

describe("parisDay et quotaKey", () => {
  it("compte les jours à l'heure de Paris", () => {
    // 23 h 30 UTC le 3 octobre = 1 h 30 le 4 à Paris.
    expect(parisDay(new Date(Date.UTC(2026, 9, 3, 23, 30)))).toBe("2026-10-04");
    expect(parisDay(new Date(Date.UTC(2026, 9, 3, 12, 0)))).toBe("2026-10-03");
  });

  it("ne laisse pas l'adresse IP en clair, et change de clé chaque jour", () => {
    const secret = "s".repeat(32);
    const today = quotaKey("203.0.113.7", "2026-10-03", secret);
    expect(today).not.toContain("203.0.113.7");
    expect(today).toHaveLength(32);
    expect(quotaKey("203.0.113.7", "2026-10-03", secret)).toBe(today);
    expect(quotaKey("203.0.113.7", "2026-10-04", secret)).not.toBe(today);
    expect(quotaKey("203.0.113.8", "2026-10-03", secret)).not.toBe(today);
  });
});

describe("consumeAnalysisQuota", () => {
  const now = new Date(Date.UTC(2026, 9, 3, 12));

  it("décompte les analyses restantes et rend un ticket pour le remboursement", async () => {
    const store = createMemoryQuotaStore();
    const first = await consumeAnalysisQuota("203.0.113.7", now, store);
    expect(first).toMatchObject({ kind: "allowed", remaining: LIMIT - 1 });
    if (first.kind !== "allowed") return;
    await refundAnalysisQuota(first.ticket, store);
    expect(await consumeAnalysisQuota("203.0.113.7", now, store)).toMatchObject({
      remaining: LIMIT - 1,
    });
  });

  it("refuse au-delà de la limite", async () => {
    const store = createMemoryQuotaStore();
    for (let i = 0; i < LIMIT; i += 1) await consumeAnalysisQuota("203.0.113.9", now, store);
    expect(await consumeAnalysisQuota("203.0.113.9", now, store)).toEqual({ kind: "limited" });
  });

  it("ferme l'analyse en production sans base ni secret", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("IP_HASH_SECRET", "");
    expect(await consumeAnalysisQuota("203.0.113.7", now)).toEqual({
      kind: "unavailable",
      reason: "no-database",
    });
    expect(await consumeAnalysisQuota("203.0.113.7", now, createMemoryQuotaStore())).toEqual({
      kind: "unavailable",
      reason: "no-secret",
    });
  });

  it("refuse un secret trop court en production", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("IP_HASH_SECRET", "court");
    expect(await consumeAnalysisQuota("203.0.113.7", now, createMemoryQuotaStore())).toEqual({
      kind: "unavailable",
      reason: "no-secret",
    });
  });

  it("se contente d'un compteur en mémoire hors production", async () => {
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("DATABASE_URL", "");
    expect(await consumeAnalysisQuota("198.51.100.1", now)).toMatchObject({ kind: "allowed" });
    await purgeExpiredQuotas(now);
  });
});
