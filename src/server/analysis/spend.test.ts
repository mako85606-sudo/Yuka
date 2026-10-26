import { afterAll, describe, expect, it } from "vitest";
import {
  overDailyBudget,
  purgeOldSpend,
  recordSpend,
  releaseSpend,
  reserveSpend,
  settleSpend,
  spentToday,
} from "@/server/analysis/spend";
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

describe("réservation atomique du budget", () => {
  it("n'accorde jamais plus que le plafond à des réservations simultanées", async () => {
    const day = new Date("2026-06-01T10:00:00Z");
    // Dix réservations de 3 $ en même temps, plafond 20 $ : au plus six passent.
    const results = await Promise.all(Array.from({ length: 10 }, () => reserveSpend(db, 3, day, 20)));
    expect(results.filter(Boolean)).toHaveLength(6);
    expect(await spentToday(db, day)).toBeCloseTo(18);
    // Le plafond reste tenu même sous une nouvelle vague.
    expect(await reserveSpend(db, 3, day, 20)).toBe(false);
    expect(await spentToday(db, day)).toBeCloseTo(18);
  });

  it("accepte une première réservation sous le plafond, refuse au-delà", async () => {
    const day = new Date("2026-06-02T10:00:00Z");
    expect(await reserveSpend(db, 1.5, day, 2)).toBe(true);
    expect(await reserveSpend(db, 1.5, day, 2)).toBe(false);
    expect(await spentToday(db, day)).toBeCloseTo(1.5);
  });

  it("solde en soustrayant le trop-réservé après une fin normale", async () => {
    const day = new Date("2026-06-03T10:00:00Z");
    await reserveSpend(db, 1.5, day, 20);
    await settleSpend(db, 1.5, 0.02, true, day);
    expect(await spentToday(db, day)).toBeCloseTo(0.02);
  });

  it("garde la réservation quand l'appel s'est interrompu (tokens sous-comptés)", async () => {
    const day = new Date("2026-06-04T10:00:00Z");
    await reserveSpend(db, 1.5, day, 20);
    await settleSpend(db, 1.5, 0.02, false, day);
    expect(await spentToday(db, day)).toBeCloseTo(1.5);
  });

  it("peut dépasser la réservation si le coût réel la dépasse", async () => {
    const day = new Date("2026-06-05T10:00:00Z");
    await reserveSpend(db, 1.5, day, 20);
    await settleSpend(db, 1.5, 2, true, day);
    expect(await spentToday(db, day)).toBeCloseTo(2);
  });

  it("rend entièrement une réservation (fichier refusé, aucun appel)", async () => {
    const day = new Date("2026-06-06T10:00:00Z");
    await reserveSpend(db, 1.5, day, 20);
    await releaseSpend(db, 1.5, day);
    expect(await spentToday(db, day)).toBeCloseTo(0);
  });
});
