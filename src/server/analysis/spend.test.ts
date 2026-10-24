import { afterAll, describe, expect, it } from "vitest";
import { overDailyBudget, purgeOldSpend, recordSpend, spentToday } from "@/server/analysis/spend";
import { createTestDb } from "@/test/test-db";

const { db, close } = await createTestDb();

afterAll(async () => {
  await close();
});

describe("plafond de dépense quotidien", () => {
  const now = new Date("2026-10-24T10:00:00Z");

  it("additionne les dépenses du jour, et seulement du jour", async () => {
    await recordSpend(db, 0.25, now);
    await recordSpend(db, 0.5, now);
    await recordSpend(db, 9, new Date("2026-10-23T10:00:00Z"));
    expect(await spentToday(db, now)).toBeCloseTo(0.75);
  });

  it("ignore une dépense nulle, négative ou inconnue", async () => {
    const before = await spentToday(db, now);
    await recordSpend(db, 0, now);
    await recordSpend(db, -3, now);
    await recordSpend(db, Number.NaN, now);
    expect(await spentToday(db, now)).toBeCloseTo(before);
  });

  it("ferme l'analyse une fois le plafond atteint", async () => {
    const day = new Date("2026-10-25T10:00:00Z");
    expect(await overDailyBudget(db, day, 1)).toBe(false);
    await recordSpend(db, 0.6, day);
    expect(await overDailyBudget(db, day, 1)).toBe(false);
    await recordSpend(db, 0.4, day);
    expect(await overDailyBudget(db, day, 1)).toBe(true);
  });

  it("efface les totaux de plus d'un an", async () => {
    await recordSpend(db, 1, new Date("2025-01-01T10:00:00Z"));
    await purgeOldSpend(db, now);
    expect(await spentToday(db, new Date("2025-01-01T10:00:00Z"))).toBe(0);
    expect(await spentToday(db, now)).toBeGreaterThan(0);
  });
});
